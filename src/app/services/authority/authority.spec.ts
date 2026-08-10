import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AuthorityService } from './authority';
import { AuthorityDTO, CreateAuthorityDTO, UpdateAuthorityDTO, PatchAuthorityDTO } from '../../models/authority/authority.model';

describe('AuthorityService', () => {
  let service: AuthorityService;
  let httpMock: HttpTestingController;

  const mockAuthority: AuthorityDTO = {
    dni: '12345678',
    name: 'Test Authority',
    rank: 1,
    zone: { id: 1, name: 'Zone A' }
  };

  const mockAuthoritiesArray: AuthorityDTO[] = [
    mockAuthority,
    { ...mockAuthority, dni: '87654321', name: 'Authority 2' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthorityService]
    });
    service = TestBed.inject(AuthorityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllAuthorities', () => {
    it('should get all authorities without params', () => {
      service.getAllAuthorities().subscribe(response => {
        expect(response.data).toEqual(mockAuthoritiesArray);
      });

      const req = httpMock.expectOne('/api/authorities');
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockAuthoritiesArray });
    });

    it('should get all authorities with zoneId param', () => {
      service.getAllAuthorities({ zoneId: '5' }).subscribe(response => {
        expect(response.data).toEqual(mockAuthoritiesArray);
      });

      const req = httpMock.expectOne(r => r.url === '/api/authorities');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('zoneId')).toBe('5');
      req.flush({ data: mockAuthoritiesArray });
    });

    it('should get all authorities with q param', () => {
      service.getAllAuthorities({ q: 'search term' }).subscribe(response => {
        expect(response.data).toEqual(mockAuthoritiesArray);
      });

      const req = httpMock.expectOne(r => r.url === '/api/authorities');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('search term');
      req.flush({ data: mockAuthoritiesArray });
    });

    it('should get all authorities with both params', () => {
      service.getAllAuthorities({ zoneId: '3', q: 'test' }).subscribe(response => {
        expect(response.data).toEqual(mockAuthoritiesArray);
      });

      const req = httpMock.expectOne(r => r.url === '/api/authorities');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('zoneId')).toBe('3');
      expect(req.request.params.get('q')).toBe('test');
      req.flush({ data: mockAuthoritiesArray });
    });

    it('should get all authorities with empty params object', () => {
      service.getAllAuthorities({}).subscribe(response => {
        expect(response.data).toEqual(mockAuthoritiesArray);
      });

      const req = httpMock.expectOne('/api/authorities');
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockAuthoritiesArray });
    });
  });

  describe('getAuthorityByDni', () => {
    it('should get authority by dni', () => {
      service.getAuthorityByDni('12345678').subscribe(response => {
        expect(response.data).toEqual(mockAuthority);
      });

      const req = httpMock.expectOne('/api/authorities/12345678');
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockAuthority });
    });

    it('should get authority with different dni', () => {
      service.getAuthorityByDni('99999999').subscribe(response => {
        expect(response.data).toEqual(mockAuthority);
      });

      const req = httpMock.expectOne('/api/authorities/99999999');
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockAuthority });
    });
  });

  describe('createAuthority', () => {
    it('should create authority', () => {
      const createPayload: CreateAuthorityDTO = {
        dni: '11111111',
        name: 'New Authority',
        email: 'new@authority.com',
        phone: '111222333',
        rank: '1',
        zoneId: '2'
      };

      service.createAuthority(createPayload).subscribe(response => {
        expect(response.data).toEqual(mockAuthority);
      });

      const req = httpMock.expectOne('/api/authorities');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createPayload);
      req.flush({ data: mockAuthority });
    });

    it('should create authority with minimal data', () => {
      const createPayload: CreateAuthorityDTO = {
        dni: '22222222',
        name: 'Minimal Authority',
        email: 'minimal@test.com',
        rank: '0',
        zoneId: '1'
      };

      service.createAuthority(createPayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/authorities');
      expect(req.request.method).toBe('POST');
      req.flush({ data: mockAuthority });
    });
  });

  describe('updateAuthority', () => {
    it('should update authority', () => {
      const updatePayload: UpdateAuthorityDTO = {
        name: 'Updated Authority',
        rank: '2',
        zoneId: '3'
      };

      service.updateAuthority('12345678', updatePayload).subscribe(response => {
        expect(response.data).toEqual(mockAuthority);
      });

      const req = httpMock.expectOne('/api/authorities/12345678');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatePayload);
      req.flush({ data: mockAuthority });
    });

    it('should update authority with different dni', () => {
      const updatePayload: UpdateAuthorityDTO = {
        name: 'Another Updated',
        rank: '1',
        zoneId: '5'
      };

      service.updateAuthority('55555555', updatePayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/authorities/55555555');
      expect(req.request.method).toBe('PUT');
      req.flush({ data: mockAuthority });
    });
  });

  describe('patchAuthority', () => {
    it('should patch authority with name', () => {
      const patchPayload: PatchAuthorityDTO = {
        name: 'Patched Name'
      };

      service.patchAuthority('12345678', patchPayload).subscribe(response => {
        expect(response.data).toEqual(mockAuthority);
      });

      const req = httpMock.expectOne('/api/authorities/12345678');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(patchPayload);
      req.flush({ data: mockAuthority });
    });

    it('should patch authority with rank', () => {
      const patchPayload: PatchAuthorityDTO = {
        rank: '2'
      };

      service.patchAuthority('12345678', patchPayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/authorities/12345678');
      expect(req.request.method).toBe('PATCH');
      req.flush({ data: mockAuthority });
    });

    it('should patch authority with zoneId', () => {
      const patchPayload: PatchAuthorityDTO = {
        zoneId: '10'
      };

      service.patchAuthority('33333333', patchPayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/authorities/33333333');
      expect(req.request.method).toBe('PATCH');
      req.flush({ data: mockAuthority });
    });

    it('should patch authority with multiple fields', () => {
      const patchPayload: PatchAuthorityDTO = {
        name: 'Multi Patch',
        rank: '3',
        zoneId: '5'
      };

      service.patchAuthority('12345678', patchPayload).subscribe();

      const req = httpMock.expectOne('/api/authorities/12345678');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(patchPayload);
      req.flush({ data: mockAuthority });
    });
  });

  describe('deleteAuthority', () => {
    it('should delete authority', () => {
      service.deleteAuthority('12345678').subscribe(response => {
        expect(response.message).toBe('Authority deleted successfully');
      });

      const req = httpMock.expectOne('/api/authorities/12345678');
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Authority deleted successfully' });
    });

    it('should delete authority with different dni', () => {
      service.deleteAuthority('99999999').subscribe(response => {
        expect(response.message).toBeDefined();
      });

      const req = httpMock.expectOne('/api/authorities/99999999');
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Deleted' });
    });
  });
});
