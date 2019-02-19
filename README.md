# Tus node server with types and hooks

credits https://github.com/tus/tus-node-server

## With express
```ts 
import {TusServer, FileStore} from '@ivaniuk/tus-server';
import * as express from 'express';

const app = express();
const server = new TusServer<express.Request>({
    dataStore: new FileStore<express.Request>({
        directory: '/tmp/tus',
        expiration: 3600, // 1 hour
    }),
    maxSize: 50 * 1024 * 1024, // 50 MB
});

app.all('/uploads', server.handle)
```
