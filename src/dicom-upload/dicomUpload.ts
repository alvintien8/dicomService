import * as Koa from 'koa';
import * as Formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { ErrorCodes, OperationStatus } from '../common/enum';
import { parseDicom, readFileData } from '../common/dicomUtils';
import { DicomServiceError } from '../common/dicomServiceError';

export const handleUpload = async (ctx: Koa.Context) => {

  try {
    validateFiles(ctx.request.files);

    const fileId = uuidv4();
    const file = (ctx.request.files.file as unknown as Formidable.File).toJSON();

    await validateDicom(file.newFilename);
    await fs.rename(`./data/${file.newFilename}`, `./data/${fileId}`);

    ctx.body = {
      fileId,
      status: OperationStatus.SUCCESS
    }
    ctx.status = 201;
  } catch (err) {
    console.error(err);
    if (err instanceof DicomServiceError && (err.code === ErrorCodes.ERR_INVALID_DICOM || err.code === ErrorCodes.ERR_FILE_NOT_FOUND || ErrorCodes.ERR_MULTI_FILE_UNSUPPORTED)) {
      ctx.status = 400;
    } else {
      ctx.status = 500;
    }

    ctx.body = {
      status: OperationStatus.ERROR,
      errorDetails: {
        code: err instanceof DicomServiceError ? err.code : ErrorCodes.ERR_UPLOAD_FAILED,
        message: "Error encountered while uploading dicom file"
      }
    }
  }
}

export const validateFiles = (files: Formidable.Files) => {
  if (!files || !Object.keys(files).includes('file')) {
    throw (new DicomServiceError(ErrorCodes.ERR_FILE_NOT_FOUND));
  }

  if (Array.isArray(files.file) || Object.keys(files).length > 1) {
    throw (new DicomServiceError(ErrorCodes.ERR_MULTI_FILE_UNSUPPORTED));
  }
}

export const validateDicom = async (fileName: string) => {
  try {
    const file = await readFileData(fileName);
    const dataset = parseDicom(file);

    //a file is condered a dicom if the mandatory tags are found
    const patientName = dataset.string('x00100010');
    const studyDate = dataset.string('x00080020');

    if (!patientName || !studyDate) {
      throw new Error();
    }

  } catch (err) {
    console.error("Invalid dicom file format, removing from system");
    await fs.unlink(`./data/${fileName}`)
    throw (new DicomServiceError(ErrorCodes.ERR_INVALID_DICOM));
  }
}