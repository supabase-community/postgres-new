import { LocalDatabase } from '~/lib/db'

export type DeployedDatabase = {
  id: number
  createdAt: Date
  url: string
}

export type Database = LocalDatabase & {
  deployment?: DeployedDatabase
}
