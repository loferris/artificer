import { useState, useCallback, useMemo } from 'react'
import {
  type ValidationResult,
  type Severity,
  groupBySeverity,
  groupByValidator,
  groupValidationsByEntity as groupByEntity,
  filterBySeverity,
  filterFixable,
  getValidationCounts,
  hasErrors,
  isValid as checkIsValid,
  sortBySeverity
} from '@artificer/hellbat'

export interface UseValidationOptions {
  initialResults?: ValidationResult[]
  autoSort?: boolean
}

export interface UseValidationReturn {
  results: ValidationResult[]
  counts: Record<Severity, number>
  isValid: boolean
  hasErrors: boolean
  groupedBySeverity: Record<Severity, ValidationResult[]>
  groupedByValidator: Record<string, ValidationResult[]>
  groupedByEntity: Record<string, ValidationResult[]>
  filterBySeverity: (severities: Severity[]) => ValidationResult[]
  fixableResults: ValidationResult[]
  addResult: (result: ValidationResult) => void
  removeResult: (id: string) => void
  clearResults: () => void
  applyFix: (id: string) => void
  applyAllFixes: () => void
  setResults: (results: ValidationResult[]) => void
}

/**
 * Hook for managing validation state
 */
export function useValidation(
  options: UseValidationOptions = {}
): UseValidationReturn {
  const { initialResults = [], autoSort = true } = options

  const [results, setResultsState] = useState<ValidationResult[]>(
    autoSort ? sortBySeverity(initialResults) : initialResults
  )

  const counts = useMemo(() => getValidationCounts(results), [results])
  const isValid = useMemo(() => checkIsValid(results), [results])
  const hasErrorsValue = useMemo(() => hasErrors(results), [results])
  const groupedBySeverity = useMemo(() => groupBySeverity(results), [results])
  const groupedByValidator = useMemo(() => groupByValidator(results), [results])
  const groupedByEntity = useMemo(() => groupByEntity(results), [results])
  const fixableResults = useMemo(() => filterFixable(results), [results])

  const addResult = useCallback((result: ValidationResult) => {
    setResultsState(prev => {
      const newResults = [...prev, result]
      return autoSort ? sortBySeverity(newResults) : newResults
    })
  }, [autoSort])

  const removeResult = useCallback((id: string) => {
    setResultsState(prev => prev.filter(r => r.id !== id))
  }, [])

  const clearResults = useCallback(() => {
    setResultsState([])
  }, [])

  const applyFix = useCallback((id: string) => {
    const result = results.find(r => r.id === id)
    if (result?.autoFix) {
      result.autoFix()
      removeResult(id)
    }
  }, [results, removeResult])

  const applyAllFixes = useCallback(() => {
    fixableResults.forEach(result => {
      if (result.autoFix) {
        result.autoFix()
      }
    })
    setResultsState(prev => prev.filter(r => !r.autoFix))
  }, [fixableResults])

  const setResults = useCallback((newResults: ValidationResult[]) => {
    setResultsState(autoSort ? sortBySeverity(newResults) : newResults)
  }, [autoSort])

  const filterBySeverityFn = useCallback((severities: Severity[]) => {
    return filterBySeverity(results, severities)
  }, [results])

  return {
    results,
    counts,
    isValid,
    hasErrors: hasErrorsValue,
    groupedBySeverity,
    groupedByValidator,
    groupedByEntity,
    filterBySeverity: filterBySeverityFn,
    fixableResults,
    addResult,
    removeResult,
    clearResults,
    applyFix,
    applyAllFixes,
    setResults
  }
}
