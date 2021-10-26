export default function Logo({ small }: { small?: boolean }) {
  return (
    <h1 className="inline brand-logo">
      <strong>
        <img
          className={"hidden dark:inline " + (small ? "h-4 w-auto" : "h-5 w-auto")}
          alt="Cal"
          title="Cal"
          src="/yac-logo-white-word.svg"
        />
        <img
          className={"inline dark:hidden " + (small ? "h-4 w-auto" : "h-5 w-auto")}
          alt="Cal"
          title="Cal"
          src="/yac-logo-word.svg"
        />
      </strong>
    </h1>
  );
}
