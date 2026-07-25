'use client'

type PetOption = {
  id: string
  name: string
  species: string | null
}

export function PetSelection({
  pets,
  onNext,
}: {
  pets: PetOption[]
  onNext: (petId: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Hangi can dostun kayıp?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Yalnızca sahibi olduğun profiller gösterilir.
        </p>
      </div>

      <div className="grid gap-3">
        {pets.map((pet) => (
          <button
            key={pet.id}
            type="button"
            onClick={() => onNext(pet.id)}
            className="flex min-h-14 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:scale-[1.01] hover:border-primary hover:bg-primary/5"
          >
            <span className="font-bold text-gray-900">{pet.name}</span>
            <span className="text-xs font-semibold uppercase text-gray-500">
              {pet.species === 'cat' || pet.species?.toLocaleLowerCase('tr-TR') === 'kedi'
                ? 'Kedi'
                : 'Köpek'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
