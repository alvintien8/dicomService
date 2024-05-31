import * as Koa from 'koa';
import * as formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';

enum FileUploadStatus {
    SUCCESS = "SUCCESS",
    ERR_UPLOAD_FAILED = "ERR_UPLOAD_FAILED",
}

export const handleUpload = async (ctx: Koa.Context) => {
    try {
        const file = (ctx.request.files.file as unknown as formidable.File).toJSON();
        const fileName = uuidv4();

        await fs.rename(`./data/${file.newFilename}`, `./data/${fileName}`);
        ctx.body = {
            fileName,
            status: FileUploadStatus.SUCCESS
        }
        ctx.status = 201;
    } catch (err) {
        console.error(err);
        ctx.status = 500;
        ctx.body = {
            status: FileUploadStatus.ERR_UPLOAD_FAILED,
            errorDetails: {
                message: "Error encountered while uploading dicom file"
            }
        }
    }
}