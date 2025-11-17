import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatTimeAgo,
  formatDuration,
  estimateRemainingTime,
  formatTimestamp
} from '../time-utils'

describe('time-utils', () => {
  describe('formatTimeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('returns "just now" for times less than a minute ago', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const fewSecondsAgo = new Date('2024-01-01T11:59:45Z') // 15 seconds ago
      expect(formatTimeAgo(fewSecondsAgo)).toBe('just now')
    })

    it('formats minutes correctly', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const oneMinuteAgo = new Date('2024-01-01T11:59:00Z')
      expect(formatTimeAgo(oneMinuteAgo)).toBe('1 minute ago')

      const fiveMinutesAgo = new Date('2024-01-01T11:55:00Z')
      expect(formatTimeAgo(fiveMinutesAgo)).toBe('5 minutes ago')
    })

    it('formats hours correctly', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const oneHourAgo = new Date('2024-01-01T11:00:00Z')
      expect(formatTimeAgo(oneHourAgo)).toBe('1 hour ago')

      const threeHoursAgo = new Date('2024-01-01T09:00:00Z')
      expect(formatTimeAgo(threeHoursAgo)).toBe('3 hours ago')
    })

    it('formats days correctly', () => {
      const now = new Date('2024-01-05T12:00:00Z')
      vi.setSystemTime(now)

      const oneDayAgo = new Date('2024-01-04T12:00:00Z')
      expect(formatTimeAgo(oneDayAgo)).toBe('1 day ago')

      const sevenDaysAgo = new Date('2023-12-29T12:00:00Z')
      expect(formatTimeAgo(sevenDaysAgo)).toBe('7 days ago')
    })

    it('formats months correctly', () => {
      const now = new Date('2024-03-01T12:00:00Z')
      vi.setSystemTime(now)

      const oneMonthAgo = new Date('2024-02-01T12:00:00Z')
      expect(formatTimeAgo(oneMonthAgo)).toBe('1 month ago')

      const sixMonthsAgo = new Date('2023-09-01T12:00:00Z')
      expect(formatTimeAgo(sixMonthsAgo)).toBe('6 months ago')
    })

    it('formats years correctly', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const oneYearAgo = new Date('2023-01-01T12:00:00Z')
      expect(formatTimeAgo(oneYearAgo)).toBe('1 year ago')

      const twoYearsAgo = new Date('2022-01-01T12:00:00Z')
      expect(formatTimeAgo(twoYearsAgo)).toBe('2 years ago')
    })
  })

  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatDuration(5)).toBe('5s')
      expect(formatDuration(45)).toBe('45s')
      expect(formatDuration(59)).toBe('59s')
    })

    it('formats minutes and seconds correctly', () => {
      expect(formatDuration(60)).toBe('1m')
      expect(formatDuration(65)).toBe('1m 5s')
      expect(formatDuration(125)).toBe('2m 5s')
      expect(formatDuration(3599)).toBe('59m 59s')
    })

    it('formats hours and minutes correctly', () => {
      expect(formatDuration(3600)).toBe('1h')
      expect(formatDuration(3660)).toBe('1h 1m')
      expect(formatDuration(7200)).toBe('2h')
      expect(formatDuration(7320)).toBe('2h 2m')
    })

    it('formats days and hours correctly', () => {
      expect(formatDuration(86400)).toBe('1d')
      expect(formatDuration(90000)).toBe('1d 1h')
      expect(formatDuration(172800)).toBe('2d')
      expect(formatDuration(176400)).toBe('2d 1h')
    })

    it('handles edge cases', () => {
      expect(formatDuration(0)).toBe('0s')
      expect(formatDuration(1)).toBe('1s')
    })
  })

  describe('estimateRemainingTime', () => {
    it('calculates remaining time correctly', () => {
      // 50% complete in 100 seconds = 100 seconds remaining
      expect(estimateRemainingTime(0.5, 100)).toBe(100)

      // 25% complete in 50 seconds = 150 seconds remaining
      expect(estimateRemainingTime(0.25, 50)).toBe(150)

      // 75% complete in 150 seconds = 50 seconds remaining
      expect(estimateRemainingTime(0.75, 150)).toBe(50)
    })

    it('returns 0 for invalid progress', () => {
      expect(estimateRemainingTime(0, 100)).toBe(0)
      expect(estimateRemainingTime(1, 100)).toBe(0)
      expect(estimateRemainingTime(1.5, 100)).toBe(0)
    })

    it('returns 0 for negative progress', () => {
      expect(estimateRemainingTime(-0.1, 100)).toBe(0)
    })

    it('rounds to nearest second', () => {
      const result = estimateRemainingTime(0.33, 100)
      expect(Number.isInteger(result)).toBe(true)
    })
  })

  describe('formatTimestamp', () => {
    it('formats date with time by default', () => {
      const date = new Date('2024-01-15T14:30:00Z')
      const result = formatTimestamp(date)

      expect(result).toContain('Jan')
      expect(result).toContain('15')
      expect(result).toContain('2024')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('formats date without time when specified', () => {
      const date = new Date('2024-01-15T14:30:00Z')
      const result = formatTimestamp(date, false)

      expect(result).toContain('Jan')
      expect(result).toContain('15')
      expect(result).toContain('2024')
      expect(result).not.toMatch(/\d{1,2}:\d{2}/)
    })
  })
})
