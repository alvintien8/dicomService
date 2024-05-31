import * as Koa from 'koa';
import * as formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

enum FileUploadStatus {
    SUCCESS = "SUCCESS",
    ERR_INVALID_DICOM = "ERR_INVALID_DICOM",
}

export const handleUpload = (ctx: Koa.Context) => {
    try {
        const file = (ctx.request.files.file as unknown as formidable.File).toJSON();
        const fileName = uuidv4();

        fs.rename(`./data/${file.newFilename}`, `./data/${fileName}`, (err) => {
            if (err) {
                throw err;
            }
        })

        ctx.body = {
            fileName,
            status: FileUploadStatus.SUCCESS
        }
        ctx.status = 201;
    } catch (err) {
        console.error(err);
        ctx.status = 500;
        ctx.body = {
            status: FileUploadStatus.ERR_INVALID_DICOM
        }
    }
}