import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from './env.js';
const execAsync = promisify(exec);

async function deleteOldFolders() {
    const now = Date.now();
    const ttlInMillis = env.CACHE_TTL * 60 * 60 * 1000;

    try {
        const folders = await fs.readdir(env.DATABASES_PATH);
        for (const folder of folders) {
            const folderPath = path.join(env.DATABASES_PATH, folder);
            const stats = await fs.stat(folderPath);

            if (stats.isDirectory() && (now - stats.mtimeMs) > ttlInMillis) {
                await fs.rm(folderPath, { recursive: true, force: true });
                console.log(`Deleted folder: ${folderPath}`);
            }
        }
    } catch (err) {
        console.error('Failed to delete old folders:', err);
    }
};

async function scriptAlreadyRan() {
    try {
        const lastRun = parseInt(await fs.readFile(env.CACHE_TIMESTAMP_FILE, 'utf8'));
        const now = Math.floor(Date.now() / 1000);
        const diff = now - lastRun;
        return diff < env.CACHE_SCHEDULE_INTERVAL * 60 * 60 * 1000;
    } catch (err) {
      // File does not exist
      if (err instanceof Error && "code" in err && err.code === 'ENOENT') {
        return false;
      }
        throw err;
    }
};

async function updateTimestampFile() {
    const now = Math.floor(Date.now() / 1000).toString();
    await fs.writeFile(env.CACHE_TIMESTAMP_FILE, now);
};

async function getDiskUsage() {
    const command = `df / | awk 'NR==2 {print $5}' | sed 's/%//'`;
    const { stdout } = await execAsync(command);
    return parseInt(stdout.trim(), 10);
};

async function getFoldersByModificationTime() {
    const folders = await fs.readdir(env.DATABASES_PATH, { withFileTypes: true });
    const folderStats = await Promise.all(
        folders
            .filter(dirent => dirent.isDirectory())
            .map(async dirent => {
                const fullPath = path.join(env.DATABASES_PATH, dirent.name);
                const stats = await fs.stat(fullPath);
                return { path: fullPath, mtime: stats.mtime.getTime() };
            })
    );
    return folderStats
        .sort((a, b) => a.mtime - b.mtime)
        .map(folder => folder.path);
}

export async function deleteCache() {
    if (await scriptAlreadyRan()) {
        console.log(`Script already ran in the last ${env.CACHE_SCHEDULE_INTERVAL} hours, skipping.`);
        return;
    }

    await updateTimestampFile();

    // Always delete old folders based on TTL
    await deleteOldFolders();

    let diskUsage = await getDiskUsage();

    // If disk usage exceeds the threshold, delete additional old folders
    if (diskUsage >= env.CACHE_DISK_USAGE_THRESHOLD) {
        console.log(`Disk usage is at ${diskUsage}%, which is above the threshold of ${env.CACHE_DISK_USAGE_THRESHOLD}%.`);

        const folders = await getFoldersByModificationTime();

        // Loop through the folders and delete them one by one until disk usage is below the threshold
        for (const folder of folders) {
            console.log(`Deleting folder: ${folder}`);
            await fs.rm(folder, { recursive: true, force: true });

            diskUsage = await getDiskUsage();
            if (diskUsage < env.CACHE_DISK_USAGE_THRESHOLD) {
                console.log(`Disk usage is now at ${diskUsage}%, which is below the threshold.`);
                break;
            }
        }
    } else {
        console.log(`Disk usage is at ${diskUsage}%, which is below the threshold of ${env.CACHE_DISK_USAGE_THRESHOLD}%.`);
    }
};