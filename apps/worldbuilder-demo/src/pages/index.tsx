import {
  operationThemes,
  validationThemes,
  OperationBadge,
  ValidationBadge
} from '@artificer/worldbuilder'

export default function WorldbuilderDemoHome() {
  const operations = operationThemes.getAll()
  const severities = validationThemes.getAll()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Worldbuilder Demo</h1>
        <p className="text-gray-600 mb-8">
          Worldbuilding operations and validation system
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Operation Types</h2>
          <div className="flex flex-wrap gap-2">
            {operations.map((theme) => (
              <OperationBadge
                key={theme.id}
                intent={theme.id as any}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Validation Severity</h2>
          <div className="flex flex-wrap gap-2">
            {severities.map((theme) => (
              <ValidationBadge
                key={theme.id}
                severity={theme.id as any}
                count={Math.floor(Math.random() * 10)}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Demo Status:</strong> This is a skeleton app. Full Worldbuilder demo
            components will be added next.
          </p>
        </div>
      </div>
    </div>
  )
}
