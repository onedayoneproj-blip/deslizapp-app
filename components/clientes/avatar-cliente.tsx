import type { ComponentProps } from "react";
import type { Cliente } from "@/lib/types";
import { Avatar } from "../ui";

/** El avatar de un cliente: su emoji y color si los eligió, si no, sus iniciales. Para cualquier lugar donde sale una persona de la tienda. */
export function AvatarCliente({ cliente, ...resto }: { cliente: Pick<Cliente, "nombre" | "avatarEmoji" | "avatarColor"> } & Omit<ComponentProps<typeof Avatar>, "nombre" | "emoji" | "color">) {
  return <Avatar nombre={cliente.nombre} emoji={cliente.avatarEmoji} color={cliente.avatarColor} {...resto} />;
}
