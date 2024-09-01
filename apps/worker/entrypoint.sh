#!/bin/sh

# Ensure the pgdata directory exists
mkdir -p ./pgdata

# Construct the S3 file path
S3_FILE="dbs/${DATABASE_ID}.tar.gz"

# Download from S3 and extract to pgdata directory in one pipeline
aws s3 cp \
    --endpoint-url "${AWS_ENDPOINT_URL_S3}" \
    "s3://${AWS_S3_BUCKET}/${S3_FILE}" - | tar -xzf - -C ./pgdata

# Check if the extraction was successful
if [ $? -eq 0 ]; then
    echo "File downloaded and extracted successfully."
else
    echo "Error occurred during download or extraction."
    exit 1
fi

# Start the PostgreSQL server
exec "$@"
