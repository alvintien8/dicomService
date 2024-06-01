import * as Koa from 'koa';
import * as DicomParser from 'dicom-parser';
import * as fs from 'fs';
import { ErrorCodes, OperationStatus } from '../common/enum';
import { DicomServiceError } from '../common/dicomServiceError';
import { parseDicom, readFileData } from '../common/dicomUtils';
import { PNG } from 'pngjs';

//TODO: can make this more flexible depending on settings
//perhaps scope to greyscale for now and tackle RGB later on.
export const createPng = (dataset: DicomParser.DataSet) => {
  const pixelDataElement = dataset.elements.x7fe00010;
  const pixelData = new Uint8Array(dataset.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length); //3639616
  const height = dataset.uint16('x00280010'); //rows 1537
  const width = dataset.uint16('x00280011'); //cols 1184
  const samplesPerPixel = dataset.uint16('x00280002');
  const numFrames = dataset.uint16('x00280008');
  const bitsAllocated = dataset.uint16('x00280100');

  console.log("samples per pixel " + samplesPerPixel);
  console.log("total frames " + numFrames);
  console.log('bits allocated ' + bitsAllocated);

  if (pixelData === undefined || width === undefined || height === undefined) {
    throw (new DicomServiceError(ErrorCodes.ERR_INVALID_IMAGE_DATA));
  }

  const image = new PNG({
    width,
    height,
    colorType: 0,
    inputColorType: 0,
    bitDepth: 16,
    bgColor: { red: 0, green: 0, blue: 0 }
  });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) << 1;
      const idx = (y * width + x) << 1;

      image.data[idx] = pixelData[pixelIndex]; // high bit
      image.data[idx + 1] = pixelData[pixelIndex + 1] & 0xFF; // low bit
    }
  }

  return image;
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