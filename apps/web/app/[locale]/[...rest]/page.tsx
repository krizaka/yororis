import { notFound } from "next/navigation";

/** Any address that is not a page of the member space: a 404. */
export default function Missing(): never {
  notFound();
}
