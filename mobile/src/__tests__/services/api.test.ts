  test('does not add Authorization header when no token', () => {
    jest.spyOn(session, 'getToken').mockReturnValue(null);
    const cfg: any = { method: 'get', url: 'res', headers: {} };
    const reqInterceptor = (api as any)._req;
    const result = reqInterceptor(cfg);
    expect(result.headers.Authorization).toBeUndefined();
  });

