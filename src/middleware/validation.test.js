describe('validation', () => {
  it('should validate required parameter', async () => {
    await api.get('/validation?required=true').expect(200)
    await api.get('/validation').expect(400)
  })

  it('should validate string and number parameter', async () => {
    await api.get('/validation?required=true&string=123&number=123').expect(200)
    await api.get('/validation?required=true&string=char&number=123').expect(200)
    await api.get('/validation?required=true&string=123&number=char').expect(400)
  })

  it('should validate array parameter', async () => {
    await api.get('/validation').query({required: true, numberArray: [1, 2]}).expect(200)
    await api.get('/validation').query({required: true, numberArray: [1, 'char']}).expect(400)
    await api.get('/validation').query({required: true, numberArray: ['123']}).expect(200)
  })

  it('should validate boolean parameter', async () => {
    await api.get('/validation?required=true&boolean=true').expect(200)
    await api.get('/validation?required=true&boolean=false').expect(200)

    // number are also treated as string in querystring
    await api.get('/validation?required=true&boolean=123').expect(400)
    await api.get('/validation?required=true&boolean=char').expect(400)
  })

  it('should validate response', async () => {
    await api.post('/validation').type('json').send({message: 'ok'}).expect(200)

    await api.post('/validation').type('json').send({not_message: 'ok'}).expect(500)
  })
})
