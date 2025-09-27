import * as profile from '@/services/profile';
import api from '@/services/api';

jest.mock('@/services/api', () => ({
  get: jest.fn(),
}));

describe('profile service', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockReset();
  });

  test('getEmployeeCompetencyProfile returns data', async () => {
    const data = { employee: { employeeNumber: '1', name: 'X', positionCode: 'C', positionTitle: 'T' }, completed: [], required: [] };
    (api.get as jest.Mock).mockResolvedValue({ data });
    const res = await profile.getEmployeeCompetencyProfile();
    expect(api.get).toHaveBeenCalledWith('profile/competencies');
    expect(res).toEqual(data);
  });
});
