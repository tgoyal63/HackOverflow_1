#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
container="hackoverflow-mongo-test-$$"
cleanup() { docker rm --force "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM

docker run --detach --rm --name "$container" --publish 127.0.0.1::27017 mongo:7 --bind_ip_all --replSet hackoverflow-test >/dev/null
address=$(docker port "$container" 27017/tcp)
port=${address##*:}
attempt=0
until docker exec "$container" mongosh --quiet --eval 'db.adminCommand({ping:1}).ok' >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo 'Disposable MongoDB did not become ready.' >&2
    exit 1
  fi
  sleep 1
done
docker exec "$container" mongosh --quiet --eval 'rs.initiate({_id:"hackoverflow-test",members:[{_id:0,host:"localhost:27017"}]})' >/dev/null
attempt=0
until docker exec "$container" mongosh --quiet --eval 'if(!db.hello().isWritablePrimary)quit(1)' >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo 'Disposable MongoDB replica set did not become primary.' >&2
    exit 1
  fi
  sleep 1
done
MONGODB_TEST_URI="mongodb://127.0.0.1:$port/hackoverflow_test_$$?directConnection=true&replicaSet=hackoverflow-test" node --test
