const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mongoose = require('mongoose');
const ComputerDetails = require('../src/models/ComputerDetails');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const hardwareOptions = {
    cpus: ['Intel Core i3-10100', 'Intel Core i5-10400', 'AMD Ryzen 5 3600', 'Intel Core i5-12400F', 'AMD Ryzen 3 3200G'],
    rams: ['8 GB', '16 GB', '32 GB'],
    storages: ['SSD 256 GB', 'SSD 512 GB', 'HDD 1 TB', 'SSD 512 GB + HDD 1 TB'],
    gpus: ['Intel UHD 630', 'NVIDIA GTX 1050 Ti', 'NVIDIA GTX 1650', 'AMD Radeon Vega 8', 'NVIDIA RTX 3050']
};

const generateSpecs = (isServer = false) => {
    if (isServer) {
        return {
            cpu: 'Intel Xeon E-2224',
            ram: '64 GB ECC',
            storage: '2x HDD 4TB (RAID 1)',
            gpu: 'Matrox G200 (Integrated)'
        };
    }
    return {
        cpu: randomElement(hardwareOptions.cpus),
        ram: randomElement(hardwareOptions.rams),
        storage: randomElement(hardwareOptions.storages),
        gpu: randomElement(hardwareOptions.gpus)
    };
};

async function main() {
  if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URL);
      console.log('Connected to MongoDB');
  }
  await prisma.session.deleteMany();
  await prisma.computer.deleteMany();
  await prisma.user.deleteMany();
  await ComputerDetails.deleteMany({});
  
  const computersData = [
    { inventoryNumber: 'SRV-01', location: 'Серверна', status: 'AVAILABLE' },
    ...Array.from({ length: 5 }).map((_, i) => ({
      inventoryNumber: `PC-305-${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
      location: 'Аудиторія 305',
      status: 'AVAILABLE'
    })),
    ...Array.from({ length: 5 }).map((_, i) => ({
      inventoryNumber: `PC-202-${i + 1}`,
      location: 'Аудиторія 202',
      status: 'AVAILABLE'
    })),
  ];

  await prisma.computer.createMany({ data: computersData });
  const allComputers = await prisma.computer.findMany();

    const mongoDocs = [];

    for (const pc of allComputers) {
        const isServer = pc.inventoryNumber.startsWith('SRV');

        mongoDocs.push({
            computerId: pc.id,
            specs: generateSpecs(isServer)
        });
    }

    await ComputerDetails.insertMany(mongoDocs);
    console.log(`Created ${mongoDocs.length} spec documents in MongoDB`);

  const commonPassword = '123';

  const usersData = [
    { 
      pib: 'Головний Адміністратор', 
      login: 'admin', 
      password: 'admin',
      role: 'DB_ADMIN', 
      accessGroup: 'root' 
    },
    { 
      pib: 'Петренко Петро (Програміст)', 
      login: 'dev', 
      password: commonPassword,
      role: 'PROGRAMMER', 
      accessGroup: 'development' 
    },
    { 
      pib: 'Іваненко Іван (Оператор)', 
      login: 'operator', 
      password: commonPassword, 
      role: 'OPERATOR', 
      accessGroup: 'support' 
    },
    { 
      pib: 'Сидоренко Сидір (Технік)', 
      login: 'tech', 
      password: commonPassword, 
      role: 'HARDWARE_SPECIALIST', 
      accessGroup: 'hardware' 
    },
    { 
      pib: 'Тестовий Юзер', 
      login: 'user', 
      password: commonPassword, 
      role: 'USER', 
      accessGroup: 'guest' 
    }
  ];

  const firstNames = ['Олександр', 'Максим', 'Дмитро', 'Анна', 'Ольга', 'Марія', 'Артем', 'Софія', 'Богдан', 'Вікторія'];
  const lastNames = ['Коваленко', 'Бондаренко', 'Шевченко', 'Ткаченко', 'Кравченко', 'Олійник', 'Лисенко', 'Мельник'];
  
  for (let i = 0; i < 15; i++) {
    const fn = randomElement(firstNames);
    const ln = randomElement(lastNames);
    usersData.push({
      pib: `${ln} ${fn}`,
      login: `user${i + 1}`,
      password: commonPassword,
      role: 'USER',
      accessGroup: 'guest'
    });
  }

  await prisma.user.createMany({ data: usersData });
  const allUsers = await prisma.user.findMany();

  const sessionsData = [];
  const now = new Date();

  for (let i = 0; i < 150; i++) {
    const user = randomElement(allUsers);
    const computer = randomElement(allComputers);

    const daysAgo = random(1, 30);
    const sessionStart = new Date(now);
    sessionStart.setDate(now.getDate() - daysAgo);
    sessionStart.setHours(random(8, 18), random(0, 59));

    const durationMinutes = random(15, 240);
    const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60000);

    sessionsData.push({
      userId: user.id,
      computerId: computer.id,
      startTime: sessionStart,
      endTime: sessionEnd
    });
  }

  await prisma.session.createMany({ data: sessionsData });

  const activeSessionsCount = 3;
  
  for (let i = 0; i < activeSessionsCount; i++) {
    const user = allUsers[i + 5];
    const computer = allComputers[i];

    const startTime = new Date(now.getTime() - random(10, 120) * 60000);

    await prisma.session.create({
      data: {
        userId: user.id,
        computerId: computer.id,
        startTime: startTime,
        endTime: null 
      }
    });

    await prisma.computer.update({
      where: { id: computer.id },
      data: { status: 'BUSY' }
    });
  }

  await prisma.computer.update({
    where: { id: allComputers[activeSessionsCount].id },
    data: { status: 'MAINTENANCE' }
  });

  console.log(`✅ Seeding completed!`);
  console.log(`   - Users created: ${allUsers.length}`);
  console.log(`   - Computers created: ${allComputers.length}`);
  console.log(`   - Sessions created: ${sessionsData.length + activeSessionsCount}`);
  console.log(`   - Credentials: admin/admin, dev/123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });