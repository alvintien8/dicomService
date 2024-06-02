import * as Koa from 'koa';
import * as DicomParser from 'dicom-parser';
import { ErrorCodes, OperationStatus } from '../common/enum';
import { DicomServiceError } from '../common/dicomServiceError';
import { parseDicom, readFileData } from '../common/dicomUtils';

export const getHeaderValue = (dataset: DicomParser.DataSet, tag: string): string | number | undefined => {
  const elementTag = `x${tag}`;
  const element = dataset.elements[elementTag];

  if (element === undefined) {
    throw (new DicomServiceError(ErrorCodes.ERR_ELEMENT_NOT_FOUND, `DICOM element not found with tag ${elementTag}`));
  }

  //extract header attributes to compatible types if possible. String values will be used as a fallback
  const vr = element.vr;
  switch (vr) {
    case 'US':
      return dataset.uint16(elementTag);
    case 'SS':
      return dataset.int16(elementTag);
    case 'UL':
      return dataset.uint32(elementTag);
    case 'SL':
      return dataset.int32(elementTag);
    case 'FL':
      return dataset.float(elementTag);
    case 'FD':
      return dataset.double(elementTag);
    case 'UT':
    case 'ST':
    case 'LT':
      return dataset.text(elementTag);
    case 'DS':
      return dataset.floatString(elementTag);
    case 'IS':
      return dataset.intString(elementTag);
    default:
      return dataset.string(elementTag);
  }
}

export const handleGetFileHeaders = async (ctx: Koa.Context) => {
  try {
    const fileId: string = ctx.params.fileId;
    const tag: string = ctx.request.query.tag as unknown as string;
    const file = await readFileData(fileId);
    const dataset = parseDicom(file);
    const value = getHeaderValue(dataset, tag);

    ctx.status = 200;
    ctx.body = {
      status: OperationStatus.SUCCESS,
      tag,
      value
    }
  } catch (err) {
    if (err instanceof DicomServiceError && err.code === ErrorCodes.ERR_ELEMENT_NOT_FOUND) {
      ctx.status = 404;
    } else {
      ctx.status = 500;
    }

    ctx.body = {
      status: OperationStatus.ERROR,
      errorDetails: {
        code: err instanceof DicomServiceError ? err.code : null,
        message: err.message
      }
    }
  }
}