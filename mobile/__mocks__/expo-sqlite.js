module.exports = {
  openDatabaseSync: () => ({
    withTransactionSync: (cb) => cb(),
    execSync: () => {},
    getAllSync: () => [],
    getFirstSync: () => null,
    runSync: () => ({ lastInsertRowId: 1 }),
  }),
}
