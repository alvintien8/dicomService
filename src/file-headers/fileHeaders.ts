import * as Koa from 'koa';
import * as fs from 'fs/promises';
import * as dicomParser from 'dicom-parser';
import { ErrorCodes, OperationStatus } from '../common/enum';
import { DicomServiceError } from '../common/dicomServiceError';

export const parseDicom = (file: Buffer): dicomParser.DataSet => {
  try {
    const options = { TransferSyntaxUID: '1.2.840.10008.1.2' };
    const dataset = dicomParser.parseDicom(file, options);
    return dataset;
  } catch (err) {
    console.error(`Error parsing dicom file: ${err}`);
    throw (new DicomServiceError(ErrorCodes.ERR_FILE_PARSING_FAILED, err.message));
  }
}

export const readFileData = async (fileId: string) => {
  try {
    const fileData = await fs.readFile(`./data/${fileId}`);
    return fileData;
  } catch (err) {
    console.error(`Error reading file data: ${err}`);
    throw (new DicomServiceError(ErrorCodes.ERR_FILE_NOT_FOUND, err.message));
  }
}

export const getHeaderValue = (dataset: dicomParser.DataSet, tag: string): string | number | undefined => {
  const elementTag = `x${tag}`;
  const element = dataset.elements[elementTag];

  if (element === undefined) {
    throw (new DicomServiceError(ErrorCodes.ERR_ELEMENT_NOT_FOUND, `DICOM element not found with tag ${elementTag}`));
  }

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

    //TODO: determine whether returning stringified values make sense, or we should actually convert them over to the right types
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