const http = require("http");

const PORT = 3000;

const alat = [
  { id: 1, nama: "Laptop Asus", kategori: "Laptop", status: "tersedia" },
  { id: 2, nama: "Kamera Canon", kategori: "Kamera", status: "dipinjam" },
  {
    id: 3,
    nama: "Arduino Uno",
    kategori: "Mikrokontroler",
    status: "tersedia",
  },
  { id: 4, nama: "ESP32", kategori: "Mikrokontroler", status: "tersedia" },
  { id: 5, nama: "Laptop Lenovo", kategori: "Laptop", status: "dipinjam" },
  { id: 6, nama: "Kamera Sony", kategori: "Kamera", status: "tersedia" },
];

const peminjaman = [];
let idPeminjamanBerikutnya = 1;

function kirimJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data, null, 2));
}

function bacaBodyJson(req) {
  return new Promise((resolve, reject) => {
    let mentah = "";
    req.on("data", (potongan) => {
      mentah += potongan;
      if (mentah.length > 1_000_000) {
        const err = new Error("Body terlalu besar");
        err.status = 413;
        reject(err);
        req.destroy();
      }
    });
    req.on("end", () => {
      if (mentah.trim() === "") return resolve(undefined);
      try {
        resolve(JSON.parse(mentah));
      } catch {
        const err = new Error("Body bukan JSON yang valid");
        err.status = 400;
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function daftarAlat(req, res) {
  kirimJson(res, 200, alat);
}

async function ajukanPeminjaman(req, res) {
  let body;
  try {
    body = await bacaBodyJson(req);
  } catch (err) {
    return kirimJson(res, err.status || 400, { pesan: err.message });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return kirimJson(res, 400, { pesan: "Body harus berupa objek JSON" });
  }
  const { alat_id, nama_peminjam } = body;

  if (!Number.isInteger(alat_id)) {
    return kirimJson(res, 400, {
      pesan: "alat_id wajib diisi dan berupa angka bulat",
    });
  }
  if (typeof nama_peminjam !== "string" || nama_peminjam.trim() === "") {
    return kirimJson(res, 400, {
      pesan: "nama_peminjam wajib diisi (teks tidak kosong)",
    });
  }

  const alatDipilih = alat.find((a) => a.id === alat_id);
  if (!alatDipilih) {
    return kirimJson(res, 404, {
      pesan: `Alat dengan id ${alat_id} tidak ditemukan`,
    });
  }
  if (alatDipilih.status !== "tersedia") {
    return kirimJson(res, 409, {
      pesan: `${alatDipilih.nama} sedang dipinjam`,
    });
  }

  const pengajuan = {
    id: idPeminjamanBerikutnya++,
    alat_id,
    nama_peminjam: nama_peminjam.trim(),
    status: "menunggu persetujuan",
  };
  peminjaman.push(pengajuan);

  kirimJson(res, 201, pengajuan);
}

const server = http.createServer(async (req, res) => {
  let path = req.url.split("?")[0];
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  const rute = {
    "/alat": { GET: daftarAlat },
    "/peminjaman": { POST: ajukanPeminjaman },
  };

  const handlerPerMethod = rute[path];
  if (!handlerPerMethod) {
    return kirimJson(res, 404, { pesan: "Endpoint tidak ditemukan" });
  }
  const handler = handlerPerMethod[req.method];
  if (!handler) {
    return kirimJson(res, 405, {
      pesan: `Method ${req.method} tidak diizinkan untuk ${path}`,
    });
  }

  try {
    await handler(req, res);
  } catch (err) {
    console.error(err);
    kirimJson(res, 500, { pesan: "Terjadi kesalahan pada server" });
  }
});

server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
