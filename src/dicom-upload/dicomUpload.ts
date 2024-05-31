import * as Koa from 'koa';
import * as formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { ErrorCodes, OperationStatus } from '../common/enum';

export const handleUpload = async (ctx: Koa.Context) => {
  try {
    const file = (ctx.request.files.file as unknown as formidable.File).toJSON();
    const fileName = uuidv4();

    await fs.rename(`./data/${file.newFilename}`, `./data/${fileName}`);
    ctx.body = {
      fileName,
      status: OperationStatus.SUCCESS
    }
    ctx.status = 201;
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = {
      status: OperationStatus.ERROR,
      errorDetails: {
        code: ErrorCodes.ERR_UPLOAD_FAILED,
        message: "Error encountered while uploading dicom file"
      }
    }
  }
}