import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as fs from 'fs';
import koaBody from 'koa-body';
import { handleUpload } from './file-upload/fileUpload';

const app = new Koa();
const router = new Router();
const config = {
    port: 3000
}

router.post('/upload', async (ctx) => {
    handleUpload(ctx);
});

app.use(async (ctx, next) => {
    console.log('Url:', ctx.url);
    await next();
});
app.use(koaBody({ multipart: true, urlencoded: true, formidable: { uploadDir: './data', keepExtensions: true, multiples: false } }));
app.use(router.routes());
app.use(router.allowedMethods());

fs.access("./data", (err) => {
    if (err) {
        console.log('data directory does not exist, proceeding to create one');
        fs.mkdir('./data', () => {
            console.log('created data directory');
        });
    }
})

app.listen(3000);

console.log(`Server running on port ${config.port}`);