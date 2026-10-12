const logoPath =
  "M1483 1406c9-4 18-13 22-17 440-347 1017-215 1106 88 106-15 337 57 290 135 0 0-291-108-373 202-148 561-527 1044-1098 1044-487 0-896-337-1007-790-1-3 95-64 258-57 161 6 316 32 316 32s-147-84-367-92c-216-8-535 61-537 35 207-9 645-278 480-683-162-398 10-890 407-1050 821-331 1004 185 768 198 0 0 279 50 263 314-14 220-224 315-365 6a524 524 0 0 0-497-330c-262 0-514 257-510 492s208 471 541 501c41 327 242 441 523 447-129-78-164-327-237-402-50-52-200-41-199-48-6 5 165-6 216-25m27 792c-236-160-686-376-1036-309a563 563 0 0 0 231-346c-14 80-37 182 51 185 285 9 517 187 752 377 30-23 83-39 144-39 94 0 170 38 170 85s-76 85-170 85c-59 0-112-15-142-38m326-913c338-120 662 12 685 174 10 64-202 95-266 96-167 2-416-240-419-270m552 325c-66 202-360 316-547 213-200-110-92-367 89-258 80 49 229 130 458 45";

export function WrenLogo() {
  return (
    <svg
      aria-hidden="true"
      className=" relative bottom-1.5 size-10 text-black"
      stroke-linejoin="round"
      stroke-miterlimit="2"
      viewBox="0 0 3000 3000"
    >
      <defs>
        <path d={logoPath} id="wren-logo-path" />
        <mask
          height="3000"
          id="wren-logo-color-mask"
          maskUnits="userSpaceOnUse"
          width="3000"
          x="0"
          y="0"
        >
          <use fill="white" fill-rule="nonzero" href="#wren-logo-path" />
          <use fill="black" fill-rule="evenodd" href="#wren-logo-path" />
        </mask>
      </defs>
      <use fill="#ffffffff" fill-rule="nonzero" href="#wren-logo-path" />
      <use fill="currentColor" fill-rule="evenodd" href="#wren-logo-path" />
    </svg>
  );
}
