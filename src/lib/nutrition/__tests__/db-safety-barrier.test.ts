import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  assertSafeDatabaseTarget,
  RemoteDatabaseRefusedError
} from '../db-safety-barrier'

describe('Beslenme P0 — Veritabanı Güvenlik Bariyeri (DB Safety Barrier)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Her test için ortamı temizle
    process.env.VITEST = 'true'
    ;(process.env as any).NODE_ENV = 'test'
    delete process.env.ALLOW_REMOTE_IMPORT
    delete process.env.CI
  })

  afterEach(() => {
    // Ortamı geri yükle
    process.env = { ...originalEnv }
  })

  // ── Yerel hedefler kabul edilir ──

  it('localhost hedefi test modunda kabul edilir', () => {
    expect(() =>
      assertSafeDatabaseTarget('http://localhost:54321', 'test')
    ).not.toThrow()
  })

  it('127.0.0.1 hedefi test modunda kabul edilir', () => {
    expect(() =>
      assertSafeDatabaseTarget('http://127.0.0.1:54321', 'test')
    ).not.toThrow()
  })

  it('localhost hedefi import modunda kabul edilir', () => {
    expect(() =>
      assertSafeDatabaseTarget('http://localhost:54321', 'import')
    ).not.toThrow()
  })

  it('localhost hedefi seed modunda kabul edilir', () => {
    expect(() =>
      assertSafeDatabaseTarget('http://localhost:54321', 'seed')
    ).not.toThrow()
  })

  // ── Uzak hedefler test ortamında reddedilir ──

  it('https://ornek.supabase.co test modunda reddedilir', () => {
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'test')
    ).toThrow(RemoteDatabaseRefusedError)
  })

  it('Reddetme REFUSING_REMOTE_DATABASE_IN_TEST mesajı içerir', () => {
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'test')
    ).toThrow(/REFUSING_REMOTE_DATABASE_IN_TEST/)
  })

  it('Remote seed işlemi reddedilir', () => {
    delete process.env.VITEST
    ;(process.env as any).NODE_ENV = 'development'
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'seed')
    ).toThrow(RemoteDatabaseRefusedError)
  })

  it('Remote import işlemi reddedilir', () => {
    delete process.env.VITEST
    ;(process.env as any).NODE_ENV = 'development'
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'import')
    ).toThrow(RemoteDatabaseRefusedError)
  })

  it('Remote import ALLOW_REMOTE_IMPORT=true ile geçiş yapar (test dışı)', () => {
    delete process.env.VITEST
    ;(process.env as any).NODE_ENV = 'development'
    process.env.ALLOW_REMOTE_IMPORT = 'true'
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'import')
    ).not.toThrow()
  })

  it('ALLOW_REMOTE_IMPORT=true olsa bile test modunda yine reddedilir', () => {
    process.env.ALLOW_REMOTE_IMPORT = 'true'
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'test')
    ).toThrow(RemoteDatabaseRefusedError)
  })

  // ── Bağlantı kurulmadan önce reddetme ──

  it('Reddetme bağlantı kurulmadan önce gerçekleşir (createClient çağrılmaz)', () => {
    const mockCreateClient = vi.fn()

    expect(() => {
      // Önce bariyer kontrol eder, sonra client oluşturur
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'test')
      // Bu satıra ulaşılmaması gerekir
      mockCreateClient('https://ornek.supabase.co', 'fake-key')
    }).toThrow(RemoteDatabaseRefusedError)

    // createClient hiç çağrılmamış olmalı
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  // ── Read/audit işlemleri remote hedefte izinlidir (test dışı) ──

  it('Remote read işlemi test dışı ortamda izinlidir', () => {
    delete process.env.VITEST
    ;(process.env as any).NODE_ENV = 'development'
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'read')
    ).not.toThrow()
  })

  it('Remote audit işlemi test dışı ortamda izinlidir', () => {
    delete process.env.VITEST
    ;(process.env as any).NODE_ENV = 'development'
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'audit')
    ).not.toThrow()
  })

  // ── CI ortamı da korunur ──

  it('CI ortamında uzak hedef reddedilir', () => {
    delete process.env.VITEST
    ;(process.env as any).NODE_ENV = 'production'
    process.env.CI = 'true'
    expect(() =>
      assertSafeDatabaseTarget('https://ornek.supabase.co', 'test')
    ).toThrow(RemoteDatabaseRefusedError)
  })
})
