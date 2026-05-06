import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavorites } from '@/hooks/useFavorites'

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
    expect(result.current.isFavorite('abc')).toBe(false)
  })

  it('adds a favorite', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => {
      result.current.toggle('abc')
    })
    expect(result.current.favorites).toEqual(['abc'])
    expect(result.current.isFavorite('abc')).toBe(true)
  })

  it('removes a favorite when toggled twice', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggle('abc'))
    act(() => result.current.toggle('abc'))
    expect(result.current.favorites).toEqual([])
    expect(result.current.isFavorite('abc')).toBe(false)
  })

  it('persists favorites to localStorage', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggle('abc'))
    expect(JSON.parse(localStorage.getItem('cr-market.favorites') ?? '[]')).toEqual(['abc'])
  })

  it('reads existing favorites from localStorage on mount', () => {
    localStorage.setItem('cr-market.favorites', JSON.stringify(['xyz', '123']))
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual(['xyz', '123'])
  })
})
