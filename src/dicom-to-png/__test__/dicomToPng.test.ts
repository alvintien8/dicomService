import * as fs from 'fs';
import * as DicomUtils from '../../common/dicomUtils';
import * as LooksSame from 'looks-same';
import * as DicomToPng from '../dicomToPng';
import { PNG } from 'pngjs';
import { DicomServiceError } from '../../common/dicomServiceError';
import { ErrorCodes, OperationStatus } from '../../common/enum';
import { createMockContext } from '@shopify/jest-koa-mocks';

describe('dicomToPng', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('return 200 on success', async () => {
    const fileStream = fs.createReadStream(`${__dirname}\\test-data\\8-bit-greyscale`);
    jest.spyOn(DicomUtils, 'readFileData').mockImplementation();
    jest.spyOn(DicomUtils, 'parseDicom').mockImplementation();
    jest.spyOn(DicomToPng, 'createPng').mockImplementation();
    jest.spyOn(DicomToPng, 'savePng').mockImplementation();
    jest.spyOn(fs, 'createReadStream').mockImplementation(() => fileStream);

    const ctx = createMockContext();
    ctx.params = { fileId: '8-bit-greyscale' };

    await DicomToPng.handleDicomToPng(ctx);

    expect(ctx.body).toBeDefined;
    expect(ctx.status).toBe(200);
    expect(ctx.response.header['content-type']).toBe('image/png');
    expect(ctx.response.header['content-disposition']).toBe('attachment; filename=8-bit-greyscale.png');
  });

  it('return 500 on unsupported file format', async () => {
    jest.spyOn(DicomUtils, 'readFileData').mockImplementation();
    jest.spyOn(DicomUtils, 'parseDicom').mockImplementation();
    jest.spyOn(DicomToPng, 'createPng').mockImplementation(() => {
      throw (new DicomServiceError(ErrorCodes.ERR_UNSUPPORTED_IMAGE_FORMAT, "DICOM format is not supported for png export"));
    });
    jest.spyOn(DicomToPng, 'savePng').mockImplementation();
    jest.spyOn(fs, 'createReadStream').mockImplementation();

    const ctx = createMockContext();
    ctx.params = { fileId: '8-bit-colour' };

    await DicomToPng.handleDicomToPng(ctx);

    expect(ctx.body).toEqual({
      status: OperationStatus.ERROR,
      errorDetails: {
        code: ErrorCodes.ERR_UNSUPPORTED_IMAGE_FORMAT,
        message: "DICOM format is not supported for png export"
      }
    })
    expect(ctx.status).toBe(500);
  });

  describe('createPng', () => {
    const exportPath = `${__dirname}\\test-data\\export.png`;
    const saveFile = async (image: PNG) => {
      await new Promise((res, rej) => {
        image.pack().pipe(fs.createWriteStream(exportPath, { flags: 'w' })).on('finish', res).on('error', rej);
      })
    }

    afterEach(async () => {
      await fs.promises.unlink(exportPath);
    })

    it('should create 8 bit greyscale image', async () => {
      const file = await fs.promises.readFile(`${__dirname}\\test-data\\8-bit-greyscale`);
      const dataset = DicomUtils.parseDicom(file)
      const image = DicomToPng.createPng(dataset);
      await saveFile(image)

      const diff = await LooksSame(exportPath, `${__dirname}\\test-data\\8-bit-greyscale.png`);
      expect(diff.equal).toBe(true);
    })

    it('should create 12 bit greyscale image', async () => {
      const file = await fs.promises.readFile(`${__dirname}\\test-data\\12-bit-greyscale`);
      const dataset = DicomUtils.parseDicom(file)
      const image = DicomToPng.createPng(dataset);
      await saveFile(image)

      const diff = await LooksSame(exportPath, `${__dirname}\\test-data\\12-bit-greyscale.png`);
      expect(diff.equal).toBe(true);
    })

    //TODO: This is a long running test, find a smaller size image if possible
    it('should create 16 bit greyscale image', async () => {
      const file = await fs.promises.readFile(`${__dirname}\\test-data\\16-bit-greyscale`);
      const dataset = DicomUtils.parseDicom(file)
      const image = DicomToPng.createPng(dataset);
      await saveFile(image)

      const diff = await LooksSame(exportPath, `${__dirname}\\test-data\\16-bit-greyscale.png`);
      expect(diff.equal).toBe(true);
    }, 10000)
  })

  describe('createPng - errors', () => {
    it('should throw error on missing image data', async () => {
      const file = await fs.promises.readFile(`${__dirname}\\test-data\\invalid-image`);
      const dataset = DicomUtils.parseDicom(file)

      try {
        DicomToPng.createPng(dataset)
        throw new Error();
      } catch (err) {
        expect(err.code).toBe(ErrorCodes.ERR_INVALID_IMAGE_DATA);
        expect(err.message).toBe("Invalid data found on selected file");
      }
    });

    it('should throw error on unsupported image format', async () => {
      const file = await fs.promises.readFile(`${__dirname}\\test-data\\8-bit-colour`);
      const dataset = DicomUtils.parseDicom(file)

      try {
        DicomToPng.createPng(dataset)
        throw new Error();
      } catch (err) {
        expect(err.code).toBe(ErrorCodes.ERR_UNSUPPORTED_IMAGE_FORMAT);
        expect(err.message).toBe("DICOM format is not supported for png export");
      }
    });
  })
})