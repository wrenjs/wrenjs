const bodyPath =
  "M2865 627c355 229 527 630 401 1148-63 4-101 13-153 23-185-118-732-174-988-172 264 16 799 82 984 201 641-153 2278 306 1986 447-59 29-163-29-163-29s403 196 201 337c-134 94-488-131-488-131 128 138 91 176 11 187-81 11-209-21-391-129-183-107-680-383-907-415a882 882 0 0 0-502-121c1035 39 715 1335 212 1429l-210-246c106 171 2 398-101 317l-167-278c70 127-14 404-176 352l-102-344c0 90-29 334-282 330l40-462s-74 158-119 196c-89 75-180 56-182 48l192-343c-84 103-140 139-181 142 6-25 205-451 205-451a659 659 0 0 1 16-355l3-3h-3a665 665 0 0 1-331-132l-597-201H810l194-79c57-181 325-260 758-269-14 0-55-156 12-280l-210-251c7-33 80 16 134 61l-183-416c58-80 274 105 316 204l-62-424c108-69 318 195 317 315l26-386c206 8 300 272 242 391l228-350c164 15 147 295 53 373z";
const accentOnePath =
  "M976 1882c159 66 422-23 786-258l-625-89zm1357-243q-223-18-390-11c198 56 295 223-76 459-116 74 22 129 22 129 675-230 1049-477 444-577";
const accentTwoPath =
  "M1760 2003c-17 10-111 33-194 33-149 0-272-37-292-85l27 2c92 0 167-49 171-110 30-3 94-5 94-5s413-18 296 99c-46 46-264 38-264 38s180 17 162 28";
const accentThreePath =
  "M1730 1339q689-18 999 347l387 117 249-31V338H1343l193 926zm995 652c-96 545-440 650-782 681l-375 843 1432 226 1085-872-741-770c-227-119-475-152-619-108";

const transform = "matrix(.602 0 0 .903 -307 -307)";

export function WrenHero() {
  return (
    <svg
      aria-label="Wren Logo"
      className=" block w-full"
      fill-rule="evenodd"
      role="img"
      stroke-linejoin="round"
      stroke-miterlimit="2"
      viewBox="0 0 3000 3000"
    >
      <defs>
        <path d={bodyPath} id="wren-hero-body" />
        <path d={accentOnePath} id="wren-hero-accent-one" />
        <path d={accentTwoPath} id="wren-hero-accent-two" />
        <path d={accentThreePath} id="wren-hero-accent-three" />
        <clipPath id="wren-hero-body-clip">
          <use href="#wren-hero-body" />
        </clipPath>
        <mask
          height="3000"
          id="wren-hero-color-mask"
          maskUnits="userSpaceOnUse"
          width="3000"
          x="0"
          y="0"
        >
          <g clip-path="url(#wren-hero-body-clip)" transform={transform}>
            <use fill="white" href="#wren-hero-accent-one" />
            <use fill="white" href="#wren-hero-accent-two" />
            <use fill="white" href="#wren-hero-accent-three" />
          </g>
        </mask>
      </defs>
      <g clip-path="url(#wren-hero-body-clip)" transform={transform}>
        <use fill="currentColor" href="#wren-hero-body" />
        <use fill="white" fill-opacity="0.878" href="#wren-hero-accent-one" />
        <use fill="white" fill-opacity="0.878" href="#wren-hero-accent-two" />
        <use fill="white" fill-opacity="0.878" href="#wren-hero-accent-three" />
      </g>
      <foreignObject height="3000" mask="url(#wren-hero-color-mask)" width="3000">
        <div
          aria-hidden="true"
          className=" size-full"
          style={{
            background:
              "radial-gradient(ellipse 65% 70% at var(--pointer-x,50%) var(--pointer-y,50%),var(--bg-purple),transparent),radial-gradient(ellipse 70% 75% at calc(var(--pointer-x,50%) + 20%) calc(var(--pointer-y,50%) + 25%),var(--bg-blue),transparent)",
          }}
        />
      </foreignObject>
    </svg>
  );
}
