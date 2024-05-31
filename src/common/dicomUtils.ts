import { DicomServiceError } from '../common/dicomServiceError';
import * as fs from 'fs/promises';
import * as dicomParser from 'dicom-parser';
import { ErrorCodes } from '../common/enum';

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