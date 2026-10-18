import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { makePdf } from '../lib/pdf';

const prisma = new PrismaClient();

const STORAGE = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), 'storage');
const PUBLIC_OFFERINGS = path.join(process.cwd(), 'public', 'assets', 'offerings');

const DEMO_PASSWORD = 'Demo!2345';

// All names, places, and figures below are synthetic demo content.
const OFFERINGS = [
  {
    slug: 'harbor-point-residences',
    name: 'Harbor Point Residences',
    status: 'OPEN',
    strategy: 'Core-Plus',
    assetType: 'Multifamily',
    location: 'Tampa, FL',
    hue: '#1f5673',
    summary: '312-unit waterfront multifamily community with value-add upside.',
    minInvestment: 500000,
    targetReturn: '14–16% IRR',
    targetHold: '5–7 yrs',
    totalRaise: 4500000000,
    amountRaised: 1800000000,
  },
  {
    slug: 'sunbelt-logistics-portfolio',
    name: 'Sunbelt Logistics Portfolio',
    status: 'OPEN',
    strategy: 'Value-Add',
    assetType: 'Industrial',
    location: 'Dallas, TX',
    hue: '#4a4e69',
    summary: 'Six last-mile distribution assets across high-growth Sunbelt metros.',
    minInvestment: 2500000,
    targetReturn: '15–18% IRR',
    targetHold: '4–6 yrs',
    totalRaise: 7500000000,
    amountRaised: 2600000000,
  },
  {
    slug: 'gulfstream-tower',
    name: 'Gulfstream Tower',
    status: 'COMING_SOON',
    strategy: 'Opportunistic',
    assetType: 'Office-to-Resi',
    location: 'Miami, FL',
    hue: '#2a6f5f',
    summary: 'Adaptive-reuse conversion of a Class-B office tower to luxury rentals.',
    minInvestment: 1000000,
    targetReturn: '17–20% IRR',
    targetHold: '3–5 yrs',
    totalRaise: 6000000000,
    amountRaised: 0,
  },
  {
    slug: 'lakeside-garden-apartments',
    name: 'Lakeside Garden Apartments',
    status: 'FULLY_SUBSCRIBED',
    strategy: 'Core',
    assetType: 'Multifamily',
    location: 'Orlando, FL',
    hue: '#7d5a50',
    summary: 'Stabilized 240-unit garden-style community, fully allocated.',
    minInvestment: 500000,
    targetReturn: '12–14% IRR',
    targetHold: '7–10 yrs',
    totalRaise: 3000000000,
    amountRaised: 3000000000,
  },
  {
    slug: 'coral-ridge-retail',
    name: 'Coral Ridge Retail Center',
    status: 'CLOSED',
    strategy: 'Value-Add',
    assetType: 'Retail',
    location: 'Fort Lauderdale, FL',
    hue: '#5c3a4e',
    summary: 'Grocery-anchored center sold in 2024 — realized deal archive.',
    minInvestment: 500000,
    targetReturn: '13% IRR (realized)',
    targetHold: 'Realized',
    totalRaise: 2200000000,
    amountRaised: 2200000000,
  },
] as const;

function heroSvg(hue: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${hue}"/><stop offset="1" stop-color="#13294b"/>
  </linearGradient></defs>
  <rect width="800" height="400" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.08">
    <rect x="60" y="180" width="120" height="180"/><rect x="200" y="120" width="120" height="240"/>
    <rect x="340" y="200" width="120" height="160"/><rect x="480" y="90" width="120" height="270"/>
    <rect x="620" y="160" width="120" height="200"/>
  </g>
</svg>`;
}

function writeDoc(key: string, title: string, lines: string[]): number {
  const full = path.join(STORAGE, key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const buf = makePdf(title, lines);
  fs.writeFileSync(full, buf);
  return buf.length;
}

async function main() {
  console.log('Resetting data…');
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.commitment.deleteMany();
  await prisma.documentAccess.deleteMany();
  await prisma.document.deleteMany();
  await prisma.session.deleteMany();
  await prisma.investingEntity.deleteMany();
  await prisma.offering.deleteMany();
  await prisma.user.deleteMany();

  fs.mkdirSync(PUBLIC_OFFERINGS, { recursive: true });

  // Offerings + hero art + offering documents
  const offeringRecords: Record<string, { id: string; name: string }> = {};
  for (const o of OFFERINGS) {
    fs.writeFileSync(path.join(PUBLIC_OFFERINGS, `${o.slug}.svg`), heroSvg(o.hue));
    const rec = await prisma.offering.create({
      data: {
        slug: o.slug,
        name: o.name,
        status: o.status,
        strategy: o.strategy,
        assetType: o.assetType,
        location: o.location,
        heroImage: `/assets/offerings/${o.slug}.svg`,
        summary: o.summary,
        description: `${o.name} is a synthetic demonstration offering located in ${o.location}. Strategy: ${o.strategy}. This provisional reconstruction uses fabricated figures to exercise the investor workflow; it does not represent a real Cardone Capital offering.\n\nBusiness plan highlights (synthetic):\n• Target net return of ${o.targetReturn} over a ${o.targetHold} hold.\n• Minimum investment of $${(o.minInvestment / 100).toLocaleString('en-US')}.\n• Professional third-party property management and quarterly investor reporting.`,
        minInvestment: o.minInvestment,
        targetReturn: o.targetReturn,
        targetHold: o.targetHold,
        totalRaise: o.totalRaise,
        amountRaised: o.amountRaised,
        closeDate: o.status === 'CLOSED' ? new Date('2024-09-30') : null,
      },
    });
    offeringRecords[o.slug] = { id: rec.id, name: rec.name };

    for (const [title, category] of [
      ['Offering Memorandum', 'OFFERING'],
      ['Operating Agreement', 'AGREEMENT'],
    ] as const) {
      const key = `documents/offerings/${o.slug}/${title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      const size = writeDoc(key, `${o.name} — ${title}`, [
        'SYNTHETIC DEMO DOCUMENT — NOT A REAL OFFERING DOCUMENT.',
        `Offering: ${o.name}`,
        `Location: ${o.location}`,
        `Strategy: ${o.strategy}`,
        `Target return: ${o.targetReturn}`,
        'This file was generated for local demonstration only.',
      ]);
      await prisma.document.create({
        data: {
          offeringId: rec.id,
          title: `${o.name} — ${title}`,
          category,
          filename: key,
          sizeBytes: size,
          visibility: 'OFFERING',
        },
      });
    }
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Investor 1: has positions, transactions, commitments, private docs ---
  const inv1 = await prisma.user.create({
    data: {
      email: 'investor1@example.com',
      passwordHash: hash,
      firstName: 'Jordan',
      lastName: 'Rivera',
      phone: '+1 305 555 0101',
    },
  });
  const inv1Individual = await prisma.investingEntity.create({
    data: { userId: inv1.id, name: 'Jordan Rivera', type: 'INDIVIDUAL', taxIdLast4: '4821' },
  });
  const inv1Trust = await prisma.investingEntity.create({
    data: { userId: inv1.id, name: 'Rivera Family Trust', type: 'TRUST', taxIdLast4: '9033' },
  });

  // Active interest in an OPEN offering
  await prisma.commitment.create({
    data: {
      userId: inv1.id,
      offeringId: offeringRecords['harbor-point-residences'].id,
      entityId: inv1Individual.id,
      amountCents: 1000000,
      status: 'INTEREST',
    },
  });

  // Funded investments in the fully-subscribed / closed deals
  const lakeside = await prisma.investment.create({
    data: {
      userId: inv1.id,
      offeringId: offeringRecords['lakeside-garden-apartments'].id,
      entityId: inv1Trust.id,
      committedCents: 5000000,
      fundedCents: 5000000,
      distributedCents: 420000,
    },
  });
  const coral = await prisma.investment.create({
    data: {
      userId: inv1.id,
      offeringId: offeringRecords['coral-ridge-retail'].id,
      entityId: inv1Individual.id,
      committedCents: 2500000,
      fundedCents: 2500000,
      distributedCents: 3100000,
    },
  });

  await prisma.transaction.createMany({
    data: [
      { investmentId: lakeside.id, type: 'CONTRIBUTION', amountCents: 5000000, date: new Date('2023-02-15'), memo: 'Initial capital contribution' },
      { investmentId: lakeside.id, type: 'DISTRIBUTION', amountCents: 210000, date: new Date('2023-08-15'), memo: 'Q2 2023 distribution' },
      { investmentId: lakeside.id, type: 'DISTRIBUTION', amountCents: 210000, date: new Date('2024-02-15'), memo: 'Q4 2023 distribution' },
      { investmentId: coral.id, type: 'CONTRIBUTION', amountCents: 2500000, date: new Date('2021-05-10'), memo: 'Initial capital contribution' },
      { investmentId: coral.id, type: 'DISTRIBUTION', amountCents: 600000, date: new Date('2022-06-30'), memo: 'Operating distribution' },
      { investmentId: coral.id, type: 'DISTRIBUTION', amountCents: 2500000, date: new Date('2024-09-30'), memo: 'Sale proceeds — return of capital + profit' },
    ],
  });

  // Private documents for investor 1 only (tax form + report)
  for (const [title, category, body] of [
    ['2023 Schedule K-1 — Rivera Family Trust', 'TAX', 'Synthetic K-1 for Lakeside Garden Apartments.'],
    ['Q4 2023 Investor Report', 'REPORT', 'Synthetic quarterly portfolio report.'],
  ] as const) {
    const key = `documents/private/${inv1.id}/${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
    const size = writeDoc(key, title, [
      'SYNTHETIC DEMO DOCUMENT — PRIVATE TO THIS INVESTOR.',
      body,
      `Investor: ${inv1.firstName} ${inv1.lastName}`,
      'Generated for local demonstration only.',
    ]);
    const doc = await prisma.document.create({
      data: { title, category, filename: key, sizeBytes: size, visibility: 'PRIVATE' },
    });
    await prisma.documentAccess.create({ data: { documentId: doc.id, userId: inv1.id } });
  }

  // --- Investor 2: minimal data, used to verify isolation ---
  const inv2 = await prisma.user.create({
    data: {
      email: 'investor2@example.com',
      passwordHash: hash,
      firstName: 'Alex',
      lastName: 'Chen',
      phone: '+1 305 555 0202',
    },
  });
  const inv2Entity = await prisma.investingEntity.create({
    data: { userId: inv2.id, name: 'Alex Chen', type: 'INDIVIDUAL', taxIdLast4: '1200' },
  });
  await prisma.commitment.create({
    data: {
      userId: inv2.id,
      offeringId: offeringRecords['sunbelt-logistics-portfolio'].id,
      entityId: inv2Entity.id,
      amountCents: 2500000,
      status: 'INTEREST',
    },
  });

  console.log('Seed complete.');
  console.log(`  investor1@example.com / ${DEMO_PASSWORD}  (positions, docs)`);
  console.log(`  investor2@example.com / ${DEMO_PASSWORD}  (isolation test)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
