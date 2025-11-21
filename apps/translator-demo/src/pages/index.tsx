import { specialistThemes, SpecialistBadge } from '@artificer/translator'

export default function TranslatorDemoHome() {
  const specialists = specialistThemes.getAll()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Translator Demo</h1>
        <p className="text-gray-600 mb-8">
          Translation pipeline with specialist agents
        </p>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Specialists</h2>
          <div className="flex flex-wrap gap-2">
            {specialists.map((theme) => (
              <SpecialistBadge
                key={theme.id}
                specialist={theme.id as any}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Demo Status:</strong> This is a skeleton app. Full Translator demo
            components will be added next.
          </p>
        </div>
      </div>
    </div>
  )
}
