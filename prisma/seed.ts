import { PrismaClient, UserRole, EntryType, RoomType, RoomStatus, PaymentType, BookingStatus, BookingPaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding with Rich Indian & Sikh Data...');

  // 1. License
  const license = await prisma.license.upsert({
    where: { licenseKey: 'GSO-TEST-1234-ABCD' },
    update: {},
    create: {
      licenseKey: 'GSO-TEST-1234-ABCD',
      expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  });

  // 2. Trust (Gurudwara)
  const trust = await prisma.trust.upsert({
    where: { id: 'test-trust-id' }, // We don't have a specific unique constraint on trust name, so we find first or create
    update: {},
    create: { 
      name: 'Gurudwara Sri Guru Singh Sabha', 
      city: 'Amritsar', 
      state: 'Punjab',
      phone: '+91 9876543210',
      email: 'info@gssamritsar.org',
      licenseId: license.id 
    },
  });

  // Since we used findFirst in case of upsert limitation on non-unique, let's ensure we get a trust
  const activeTrust = await prisma.trust.findFirst() || trust;

  // 3. Users
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@gurusewa.com' },
    update: {},
    create: { 
      name: 'Paramjit Singh (Super Admin)', 
      email: 'admin@gurusewa.com', 
      passwordHash: hashedPassword, 
      role: UserRole.SUPERADMIN 
    },
  });

  const trustAdmin = await prisma.user.upsert({
    where: { email: 'gss@gurusewa.com' },
    update: {},
    create: { 
      name: 'Harjit Singh (Admin)', 
      email: 'gss@gurusewa.com', 
      passwordHash: hashedPassword, 
      role: UserRole.ADMIN, 
      trustId: activeTrust.id 
    },
  });

  const deskUser = await prisma.user.upsert({
    where: { email: 'sewadar@gurusewa.com' },
    update: {},
    create: {
      name: 'Manpreet Kaur (Sewadar)',
      email: 'sewadar@gurusewa.com',
      passwordHash: hashedPassword,
      role: UserRole.USER,
      trustId: activeTrust.id
    }
  });

  // 4. Categories (Receipts & Payments)
  const receiptHeads = {
    'KADAH PRASAD SEWA': ['ARDAAS SEWA', 'GHEE SEWA', 'KADAH PRASHAD SEWA', 'RASHAD SEWA'],
    'LANGAR SEWA': ['BARTAN BHETA', 'LANGAR AMOUNT', 'LANGAR CLEANING', 'LANGAR HALL BHETA', 'LANGAR SEWA', 'PURANMASI LANGAR'],
    'OTHER COLLECTIONS': ['ANAND KAARAJ BHETA', 'BUILDING FUND SEWA', 'DARSHAN BHETA', 'EDUCATION FUND SEWA', 'GOLAK COLLECTION RECEIPT', 'MEDICAL ASSISTANCE SEWA', 'RENT RECEIPT/COLLECTION', 'YATRI NIVAS FUND SEWA'],
    'PATH SEWA': ['AKHAND PATH SEWA', 'KEERTAN SEWA', 'SAHEJ PATH SEWA', 'SAPTAH PATH SEWA', 'SUKHMANI SAHEB PATH']
  };

  const paymentHeads = {
    'GENERAL EXPENSES': ['GROCERIES EXPENSES', 'GURUDWARA ELECTRICITY', 'ITEM PURCHASE', 'REPAIRS AND MAINTENANCE'],
    'SIKH YOUTH ASSISTANCE': ['EDUCATION FINANCIAL ASSISTANCE', 'FINANCIAL AID/DONATION', 'SPORTS & EQUIPMENTS'],
    'STAFF PAYMENTS': ['STAFF INSURANCE', 'STAFF LOAN', 'STAFF MEDICAL', 'STAFF SALARIES'],
    'YATRI NIVAS PAYMENTS': ['YATRI NIVAS PURCHASE', 'YATRI NIVAS MAINTENANCE', 'YATRI NIVAS SECURITY']
  };

  // Process Receipts Categories
  const categoryMap: Record<string, string> = {}; // Name to ID mapping

  for (const [headName, categories] of Object.entries(receiptHeads)) {
    const head = await prisma.categoryHead.upsert({
      where: { trustId_type_name: { trustId: activeTrust.id, type: EntryType.RECEIPT, name: headName } },
      update: {},
      create: { trustId: activeTrust.id, type: EntryType.RECEIPT, name: headName },
    });
    for (const catName of categories) {
      const cat = await prisma.category.upsert({
        where: { headId_name: { headId: head.id, name: catName } },
        update: {},
        create: { headId: head.id, trustId: activeTrust.id, name: catName }
      });
      categoryMap[catName] = cat.id;
    }
  }

  for (const [headName, categories] of Object.entries(paymentHeads)) {
    const head = await prisma.categoryHead.upsert({
      where: { trustId_type_name: { trustId: activeTrust.id, type: EntryType.PAYMENT, name: headName } },
      update: {},
      create: { trustId: activeTrust.id, type: EntryType.PAYMENT, name: headName },
    });
    for (const catName of categories) {
      const cat = await prisma.category.upsert({
        where: { headId_name: { headId: head.id, name: catName } },
        update: {},
        create: { headId: head.id, trustId: activeTrust.id, name: catName }
      });
      categoryMap[catName] = cat.id;
    }
  }

  // 5. Rooms (Yatri Nivas)
  const roomData = [
    { roomNumber: '101', name: 'Mata Gujri Niwas - Standard', type: RoomType.SINGLE, capacity: 1, ratePerDay: 200, status: RoomStatus.AVAILABLE, floor: 'Ground Floor' },
    { roomNumber: '102', name: 'Mata Gujri Niwas - Standard', type: RoomType.SINGLE, capacity: 2, ratePerDay: 350, status: RoomStatus.AVAILABLE, floor: 'Ground Floor' },
    { roomNumber: '201', name: 'Guru Nanak Bhawan - Double', type: RoomType.DOUBLE, capacity: 2, ratePerDay: 500, status: RoomStatus.AVAILABLE, floor: 'First Floor' },
    { roomNumber: '202', name: 'Guru Nanak Bhawan - AC', type: RoomType.DOUBLE, capacity: 3, ratePerDay: 800, status: RoomStatus.AVAILABLE, floor: 'First Floor' },
    { roomNumber: '301', name: 'Baba Deep Singh Suite', type: RoomType.FAMILY, capacity: 5, ratePerDay: 1200, status: RoomStatus.AVAILABLE, floor: 'Second Floor' },
    { roomNumber: '302', name: 'Dormitory Hall', type: RoomType.DORMITORY, capacity: 10, ratePerDay: 100, status: RoomStatus.AVAILABLE, floor: 'Second Floor' },
  ];

  const createdRooms = [];
  for (const room of roomData) {
    const r = await prisma.room.upsert({
      where: { trustId_roomNumber: { trustId: activeTrust.id, roomNumber: room.roomNumber } },
      update: {},
      create: { ...room, trustId: activeTrust.id }
    });
    createdRooms.push(r);
  }

  // 6. Transactions (Receipts & Payments) - Only seed if table is empty to avoid infinite growth
  const receiptCount = await prisma.receipt.count();
  if (receiptCount === 0) {
    const sikhNames = [
      'Gurpreet Singh', 'Amrit Kaur', 'Jaswinder Singh', 'Manpreet Kaur', 
      'Balwinder Singh', 'Harjit Kaur', 'Simranjit Singh', 'Navdeep Kaur',
      'Taranjeet Singh', 'Daljit Kaur', 'Rajinder Singh', 'Sukhdeep Kaur'
    ];
    
    const receiptCats = [
      'ARDAAS SEWA', 'LANGAR SEWA', 'BUILDING FUND SEWA', 'AKHAND PATH SEWA', 'KADAH PRASHAD SEWA'
    ];

    console.log('Seeding Receipts...');
    for (let i = 0; i < 15; i++) {
      const name = sikhNames[i % sikhNames.length];
      const catName = receiptCats[i % receiptCats.length];
      const amount = Math.floor(Math.random() * 50) * 100 + 500; // Between 500 and 5500
      
      const isOnline = i % 3 === 0;

      await prisma.receipt.create({
        data: {
          trustId: activeTrust.id,
          receiptNo: `REC-${new Date().getFullYear()}-${1000 + i}`,
          fullName: name,
          mobileNumber: `98${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          address: i % 2 === 0 ? 'Amritsar, Punjab' : 'Jalandhar, Punjab',
          amount,
          paymentType: isOnline ? PaymentType.ONLINE : PaymentType.CASH,
          transactionId: isOnline ? `UPI${Math.floor(Math.random() * 10000000000)}` : null,
          categoryId: categoryMap[catName],
          date: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000), // Random date in last 10 days
          createdById: trustAdmin.id,
          isCollected: i % 4 !== 0,
        }
      });
    }

    const paymentVendors = [
      'Punjab State Power Corp (PSPCL)', 'Khalsa Grocery Store', 
      'Singh Hardware & Sanitary', 'Bhai Gurdas Printing Press',
      'Sukhbir Singh (Electrician)', 'Amritsar Dairy Farm'
    ];
    
    const paymentCats = [
      'GURUDWARA ELECTRICITY', 'GROCERIES EXPENSES', 'REPAIRS AND MAINTENANCE', 'ITEM PURCHASE'
    ];

    console.log('Seeding Payments...');
    for (let i = 0; i < 8; i++) {
      const vendor = paymentVendors[i % paymentVendors.length];
      const catName = paymentCats[i % paymentCats.length];
      const amount = Math.floor(Math.random() * 100) * 100 + 1000;

      await prisma.payment.create({
        data: {
          trustId: activeTrust.id,
          paymentNo: `PAY-${new Date().getFullYear()}-${1000 + i}`,
          payeeName: vendor,
          mobileNumber: `97${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          amount,
          paymentType: PaymentType.CHEQUE,
          chequeNo: `CHQ${Math.floor(Math.random() * 100000)}`,
          bankName: 'HDFC Bank',
          categoryId: categoryMap[catName],
          date: new Date(Date.now() - Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000),
          createdById: trustAdmin.id,
        }
      });
    }
  }

  // 7. Bookings
  const bookingCount = await prisma.roomBooking.count();
  if (bookingCount === 0) {
    const bookingNames = ['Gurmit Singh', 'Karamjit Kaur', 'Diljit Singh', 'Paramjit Kaur', 'Jagdeep Singh'];
    const statuses = [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CONFIRMED];
    
    console.log('Seeding Bookings...');
    for (let i = 0; i < 5; i++) {
      const room = createdRooms[i];
      const guestName = bookingNames[i];
      const checkIn = new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days stay
      const totalAmount = Number(room.ratePerDay) * 2;

      await prisma.roomBooking.create({
        data: {
          trustId: activeTrust.id,
          bookingNo: `BKG-${new Date().getFullYear()}-${1000 + i}`,
          roomId: room.id,
          guestName,
          mobileNumber: `99${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          address: 'Ludhiana, Punjab',
          idProofType: 'Aadhaar Card',
          idProofNo: `${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
          checkIn,
          checkOut,
          adults: 2,
          children: 0,
          totalNights: 2,
          ratePerNight: room.ratePerDay,
          totalAmount,
          advancePaid: totalAmount / 2,
          balanceDue: totalAmount / 2,
          paymentStatus: BookingPaymentStatus.PARTIAL,
          paymentType: PaymentType.CASH,
          bookingStatus: statuses[i],
          createdById: deskUser.id,
        }
      });
    }
  }

  console.log('✅ Database seeded successfully with Indian/Sikh contextual data!');
}

main().catch(console.error).finally(() => prisma.$disconnect());