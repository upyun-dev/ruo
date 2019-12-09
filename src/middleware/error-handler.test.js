describe('error-handler', () => {
  it('should return global error code in common middleware', async () => {
    await api.get('/exception')
      .expect(400)
  })

  it('should return local error code inside handler', async () => {
    await api.get('/exception')
      .query({message: 'BadRequest'})
      .expect(400)
  })

  it('should return local only error code', async () => {
    await api.get('/exception')
      .query({message: 'UnknownException'})
      .expect(500)
  })

  it('should return normal error code if x-errors not exist', async () => {
    await api.delete('/exception')
      .expect(400)
  })

  it('should construct via route path rather than real path', async () => {
    await api.get('/exception/0')
      .query({message: 'BadRequest'})
      .expect(400)
  })
})
