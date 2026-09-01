import { test } from '@playwright/test'
import { PERSONAS } from '../personas'
import { runPersonaFlow } from '../helpers/persona-flow'

const persona = PERSONAS.find(p => p.id === 'can')!
const { defaultBrowserType: _dbt, ...deviceOptions } = (persona.device as any) || {}

test.describe(`Persona Akışı: ${persona.name}`, () => {
  test.use({ ...deviceOptions })

  test(`persona tam akış testi - ${persona.id}`, async ({ page }) => {
    test.setTimeout(15 * 60 * 1000)
    await runPersonaFlow(page, persona)
  })
})
