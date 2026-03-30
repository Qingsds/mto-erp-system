export function PartDetailLoadingState() {
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex-1 overflow-auto p-4 sm:p-6 lg:p-8'>
        <div className='flex flex-col gap-4'>
          <div className='h-24 bg-muted animate-pulse' />
          <div className='flex flex-col gap-8 lg:flex-row'>
            <div className='w-full shrink-0 aspect-[4/3] bg-muted animate-pulse sm:aspect-square lg:w-80 xl:w-96' />
            <div className='flex-1 flex flex-col gap-4 pt-2'>
              {[60, 40, 50, 35, 55].map((width, index) => (
                <div
                  key={index}
                  className='h-4 bg-muted animate-pulse'
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
