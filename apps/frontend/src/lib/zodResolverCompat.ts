import { zodResolver } from "@hookform/resolvers/zod"
import type { FieldValues, Resolver } from "react-hook-form"

export function zodResolverCompat<TInput extends FieldValues, TOutput>(
  schema: unknown,
): Resolver<TInput, unknown, TOutput> {
  return zodResolver(schema as never) as unknown as Resolver<
    TInput,
    unknown,
    TOutput
  >
}
