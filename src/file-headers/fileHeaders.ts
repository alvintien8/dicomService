import * as Koa from 'koa';
import * as fs from 'fs/promises';
import * as dicomParser from 'dicom-parser';

enum HeaderExtractionStatus {
    SUCCESS = "SUCCESS",
    ERR_FILE_NOT_FOUND = "ERR_FILE_NOT_FOUND",
    ERR_HEADER_READ_FAILED = "ERR_HEADER_READ_FAILED"
}

export const parseDicom = (file: Buffer): dicomParser.DataSet => {
    try {
        const options = { TransferSyntaxUID: '1.2.840.10008.1.2' };
        const dataset = dicomParser.parseDicom(file, options);
        return dataset;
    } catch (err) {
        console.error(`Error parsing dicom file: ${err}`);
        //TODO: rethrow with a custom code
        throw(err);
    }
}

export const readFileData = async (fileId: string) => {
    try {
        const fileData = await fs.readFile(`./data/${fileId}`);
        return fileData;
    } catch (err) {
        console.error(`Error reading file data: ${err}`);
        //TODO: rethrow with a custom code
        throw(err);
    }
}

export const getHeaderValue = (dataset: dicomParser.DataSet, tag: string): string | number | undefined => {
    const elementTag = `x${tag}`;
    const element = dataset.elements[elementTag];

    //TODO: makes more sense to error out with 404
    if (element === undefined) {
        console.warn(`Cannot find DICOM element with tag: ${elementTag}`);
        return null;
    }

    const vr = element.vr;
    switch(vr) {
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
            tag,
            value
        }
    } catch (err) {
        ctx.status = 500;
        ctx.body = {
            status: "HEADER READ FAILED",
            errorDetails: {
                message: "Failed to fetch header data"
            }
        }
    }
}