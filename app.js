const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const databasePath = path.join(__dirname, 'covid19India.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertDbObjectTOResponseObject = dbobject => {
  return {
    stateId: dbobject.state_id,
    stateName: dbobject.state_name,
    population: dbobject.population,
  }
}

// states API

app.get('/states/', async (request, response) => {
  const getStateQuery = `
  SELECT
  *
  FROM
  state;`
  const stateArray = await database.all(getStateQuery)
  response.send(
    stateArray.map(eachState => convertDbObjectTOResponseObject(eachState)),
  )
})

// stateId API

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT * FROM state WHERE state_id=${stateId};`
  const stateDetails = await database.get(getStateQuery)
  response.send(convertDbObjectTOResponseObject(stateDetails))
})

// API -3

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const createDistrictQuery = `
  INSERT INTO 
    district (district_name,state_id,cases,cured,active,deaths)
  VALUES 
    ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`
  await database.run(createDistrictQuery)
  response.send('District Successfully Added')
})

// API - 4

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictDetailsQuery = `
        SELECT * FROM district WHERE district_id=${districtId}`
  const district = await database.get(getDistrictDetailsQuery)
  response.send({
    districtId: district.district_id,
    districtName: district.district_name,
    stateId: district.state_id,
    cases: district.cases,
    cured: district.cured,
    active: district.active,
    deaths: district.deaths,
  })
})

// API -5

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `
        DELETE FROM
        district
        WHERE
        district_id = ${districtId};`
  await database.run(deleteQuery)
  response.send('District Removed')
})

//API-6

app.put('/districts/:districtId/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const {districtId} = request.params
  const updateDistrictQuery = `
  UPDATE 
    district
  SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
  WHERE
    district_Id = ${districtId};`

  await database.run(updateDistrictQuery)
  response.send('District Details Updated')
})

// API-7

const convertToResponse = dbobjects => {
  return {
    totalcases: dbobjects['SUM(cases)'],
    totalcured: dbobjects['SUM(cured)'],
    totalactive: dbobjects['SUM(active)'],
    totaldeaths: dbobjects['SUM(deaths)'],
  }
}

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatsQuery = `
        SELECT 
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM 
            district
        WHERE 
            state_id=${stateId};`
  const stateStats = await database.get(getStatsQuery)
  response.send(convertToResponse(stateStats))
})

// API-8

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictName = `
        SELECT
            state_name
        FROM
            district
        NATURAL JOIN
            state
        WHERE 
            district_id=${districtId};
    `
  const stateName = await database.get(getDistrictName)
  response.send({
    stateName: stateName.state_name,
  })
})

module.exports = app
