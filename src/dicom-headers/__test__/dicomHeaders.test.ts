import * as fs from 'fs/promises';
import * as DicomParser from 'dicom-parser';
import * as DicomUtils from '../../common/dicomUtils';
import * as Dicomheaders from '../dicomHeaders';
import { createMockContext } from '@shopify/jest-koa-mocks';
import { ErrorCodes, OperationStatus } from '../../common/enum';
import { DicomServiceError } from '../../common/dicomServiceError';

describe('dicomHeaders', () => {
  let file;
  let dataset: DicomParser.DataSet;

  beforeAll(async () => {
    file = await fs.readFile(`${__dirname}\\test-data\\sample-xray-dicom`);
    dataset = DicomUtils.parseDicom(file)
  })

  afterEach(() => {
    jest.restoreAllMocks();
  })

  it('should return 200 success', async () => {
    jest.spyOn(DicomUtils, 'readFileData').mockImplementation();
    jest.spyOn(DicomUtils, 'parseDicom').mockImplementation(() => dataset);

    const ctx = createMockContext();
    ctx.params = { fileId: 'sample-xray-dicom' };
    ctx.request.query.tag = '00100010';
    await Dicomheaders.handleGetFileHeaders(ctx);

    expect(ctx.body).toEqual({
      status: OperationStatus.SUCCESS,
      tag: '00100010',
      value: 'NAYYAR^HARSH'
    })
    expect(ctx.status).toBe(200);
  })

  it('should return 404 error', async () => {
    jest.spyOn(DicomUtils, 'readFileData').mockImplementation();
    jest.spyOn(DicomUtils, 'parseDicom').mockImplementation(() => dataset);

    const ctx = createMockContext();
    ctx.params = { fileId: 'sample-xray-dicom' };
    ctx.request.query.tag = 'FFFFFFFF';
    await Dicomheaders.handleGetFileHeaders(ctx);

    expect(ctx.body).toEqual({
      status: OperationStatus.ERROR,
      errorDetails: {
        code: ErrorCodes.ERR_ELEMENT_NOT_FOUND,
        message: "DICOM element not found with tag xFFFFFFFF"
      }
    })
    expect(ctx.status).toBe(404);
  })

  it('should return 500 error', async () => {
    jest.spyOn(DicomUtils, 'readFileData').mockImplementation(
      () => {
        throw new DicomServiceError(ErrorCodes.ERR_FILE_PARSING_FAILED, "Error reading file")
      }
    );
    jest.spyOn(DicomUtils, 'parseDicom').mockImplementation();

    const ctx = createMockContext();
    ctx.params = { fileId: 'sample-xray-dicom' };
    ctx.request.query.tag = 'FFFFFFFF';
    await Dicomheaders.handleGetFileHeaders(ctx);

    expect(ctx.body).toEqual({
      status: OperationStatus.ERROR,
      errorDetails: {
        code: ErrorCodes.ERR_FILE_PARSING_FAILED,
        message: "Error reading file"
      }
    })
    expect(ctx.status).toBe(500);
  })

  describe("getHeaderValue", () => {
    it('returns unsigned short', () => {
      const tag = "00280010"
      expect(Dicomheaders.getHeaderValue(dataset, tag)).toBe(1537);
    })

    it('returns signed short', () => {
      const tag = "00281041"
      expect(Dicomheaders.getHeaderValue(dataset, tag)).toBe(-1);
    })

    it('returns unsigned int', () => {
      const tag = "00020000"
      expect(Dicomheaders.getHeaderValue(dataset, tag)).toBe(198);
    })

    it('returns numerical decimal string', () => {
      const tag = "00181411"
      expect(Dicomheaders.getHeaderValue(dataset, tag)).toBe(3.2125);
    })

    it('returns numerical integer string', () => {
      const tag = "00200011"
      expect(Dicomheaders.getHeaderValue(dataset, tag)).toBe(2);
    })

    it('returns short text', () => {
      const tag = "00080081"
      expect(Dicomheaders.getHeaderValue(dataset, tag)).toBe('568 S MATHILDA AVE SUNNYVA CA 94086');
    })

    it('returns string value', () => {
      const tag = '00100010';
      expect(Dicomheaders.getHeaderValue(dataset, tag)).toBe('NAYYAR^HARSH');
    })
  })
})