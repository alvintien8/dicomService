import * as Koa from 'koa';
import { OperationStatus } from '../common/enum';
import { DicomServiceError } from '../common/dicomServiceError';
import { parseDicom, readFileData } from '../common/dicomUtils';

export const handleDicomToPng = async (ctx: Koa.Context) => {
  try {
    const fileId: string = ctx.params.fileId;
    const file = await readFileData(fileId);
    const dataset = parseDicom(file);
    const pixelData = dataset.elements.x7fe00010;

    console.log(pixelData);
    ctx.status = 200;
    ctx.body = "success!";
    //TODO: need to return the actual converted image
  } catch (err) {
    ctx.status = 500;
    ctx.body = {
      status: OperationStatus.ERROR,
      errorDetails: {
        code: err instanceof DicomServiceError ? err.code : null,
        message: err.message
      }
    }
  }
}