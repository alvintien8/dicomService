import * as Koa from 'koa';
import * as DicomParser from 'dicom-parser';
import * as fs from 'fs';
import { ErrorCodes, OperationStatus } from '../common/enum';
import { DicomServiceError } from '../common/dicomServiceError';
import { parseDicom, readFileData } from '../common/dicomUtils';
import { PNG } from 'pngjs';

export const handleDicomToPng = async (ctx: Koa.Context) => {
  try {
    const exportPath = './data/export';
    const fileId: string = ctx.params.fileId;
    const outputFilePath = `${exportPath}/${fileId}.png`
    const file = await readFileData(fileId);
    const dataset = parseDicom(file);
    const png = createPng(dataset);

    await savePng(png, fileId);

    ctx.status = 200;
    ctx.set('Content-type', 'image/png');
    ctx.set('Content-disposition', `attachment; filename=${fileId}.png`);
    ctx.body = fs.createReadStream(outputFilePath);
  } catch (err) {
    console.error(err);

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

export const createPng = (dataset: DicomParser.DataSet) => {
  const pixelDataElement = dataset.elements.x7fe00010;
  const height = dataset.uint16('x00280010');
  const width = dataset.uint16('x00280011');
  const samplesPerPixel = dataset.uint16('x00280002');
  const numFrames = dataset.uint16('x00280008');
  const bitsAllocated = dataset.uint16('x00280100');
  const bitsStored = dataset.uint16('x00280101');

  if (pixelDataElement === undefined || width === undefined || height === undefined) {
    throw (new DicomServiceError(ErrorCodes.ERR_INVALID_IMAGE_DATA, "Invalid data found on selected file"));
  }

  if (samplesPerPixel > 1 || numFrames > 1 || bitsAllocated > 16 || bitsAllocated < 8) {
    throw (new DicomServiceError(ErrorCodes.ERR_UNSUPPORTED_IMAGE_FORMAT, "DICOM format is not supported for png export"));
  }

  const pixelData = new Uint8Array(dataset.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length);
  const image = new PNG({
    width,
    height,
    colorType: 0,
    inputColorType: 0,
    bitDepth: bitsAllocated > 8 ? 16 : 8,
    bgColor: { red: 0, green: 0, blue: 0 }
  });

  if (bitsStored > 8) {
    handle16BitGreyscale(image, pixelData, bitsStored === 12);
  } else {
    handle8BitGreyscale(image, pixelData);
  }

  return image;
}

export const handle16BitGreyscale = (image: PNG, pixelData: Uint8Array, shouldUpscale?: boolean) => {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const pixelIndex = (y * image.width + x) << 1;
      const idx = (y * image.width + x) << 1;
      let msb = pixelData[pixelIndex];
      let lsb = pixelData[pixelIndex + 1] & 0xFF;

      //handle scaling for 12 bit images
      if (shouldUpscale) {
        const ratio = (2 ** 16 - 1) / (2 ** 12 - 1)
        const upscaledValue = ((msb << 8 | lsb) * ratio) & 0xFFFF;
        msb = upscaledValue >> 8;
        lsb = upscaledValue & 0xFF;
      }

      image.data[idx] = msb; // high byte
      image.data[idx + 1] = lsb; // low byte
    }
  }
}

export const handle8BitGreyscale = (image: PNG, pixelData: Uint8Array) => {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const pixelIndex = (y * image.width + x);
      const idx = (y * image.width + x);
      image.data[idx] = pixelData[pixelIndex];
    }
  }
}

export const savePng = async (png: PNG, fileId: string) => {
  const exportPath = './data/export';

  await fs.promises.mkdir(exportPath, { recursive: true })
    .catch((err) => {
      throw (new DicomServiceError(ErrorCodes.ERR_EXPORT_DIRECTORY_MISSING, err.message))
    });

  await new Promise((res, rej) => {
    png.pack().pipe(fs.createWriteStream(`${exportPath}/${fileId}.png`, { flags: 'w' })).on('finish', res).on('error', rej);
  })
}