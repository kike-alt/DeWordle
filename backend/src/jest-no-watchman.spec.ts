describe('jest-no-watchman command builder', () => {
  const buildCommand = (extraArgs: string[] = []) => [
    'jest',
    '--watchman=false',
    ...extraArgs,
  ];

  it('includes the watchman flag for standard test runs', () => {
    expect(buildCommand()).toEqual(['jest', '--watchman=false']);
  });

  it('preserves extra args such as coverage', () => {
    expect(buildCommand(['--coverage'])).toEqual([
      'jest',
      '--watchman=false',
      '--coverage',
    ]);
  });
});
