#!/bin/sh

while nc -z localhost 5432; do
  sleep 10 # wait for 10 second before checking again
done

echo "Port 5432 is no longer open. Exiting."
