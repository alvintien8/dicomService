import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as fs from 'fs';
import koaBody from 'koa-body';
import { handleUpload } from './file-upload/fileUpload';
import { handleGetFileHeaders } from './file-headers/fileHeaders';

const app = new Koa();
const router = new Router();
const config = {
    port: 3000
}

router.post('/upload', async (ctx) => {
    await handleUpload(ctx);
});

router.get('/headers/:fileId', async (ctx) => {
    await handleGetFileHeaders(ctx);
})

app.use(async (ctx, next) => {
    console.log('Url:', ctx.url);
    await next();
});
app.use(koaBody({ multipart: true, urlencoded: true, formidable: { uploadDir: './data', keepExtensions: true, multiples: false } }));
app.use(router.routes());
app.use(router.allowedMethods());

fs.access("./data", (err) => {
    if (err && err.code === "ENOENT") {
        console.log('data directory does not exist, proceeding to create one');
        fs.mkdir('./data', (err) => {
            if (err) {
                console.error(`Error encountered while initializing data directory: ${err}`, err)
            } else {
                console.log('successfully created data directory');
            }
        });
    } else if (err) {
        console.error(err);
    }
})

app.listen(3000);

console.log(`Server running on port ${config.port}`);