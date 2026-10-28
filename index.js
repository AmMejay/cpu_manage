const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");
const db = new Database("banco.db", { verbose: console.log });
const app = express();
const classeTemp = require("./classe.js");
const port = 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Rota para a página inicial
app.get("/", (req, res) => {
res.send(path.join(__dirname, "public", "index.html"));
});

// Rota para cadastrar uma nova medição
app.post("/medicao", async (req, res) => {
  const { descricao, tipo, valor_original, unidade_original } = req.body;
  if (!descricao || !tipo || !valor_original || !unidade_original) {
    return res.status(400).json({
      mensagem: "Verifique se todos os campos estão preenchidos",
    });
  }
  const { valor_convertido, unidade_convertida, status } = classeTemp(
    Number(valor_original),
    String(unidade_original),
  );
  try {
    const rows = await db
      .prepare(
        "INSERT INTO medicoes (`descricao`, `tipo`, `valor_original`, `unidade_original`, `valor_convertido`, `unidade_convertida`, `status`) VALUES (?,?,?,?,?,?,?);",
      )
      .run([
        descricao,
        tipo,
        valor_original,
        unidade_original,
        valor_convertido,
        unidade_convertida,
        status,
      ]);
    res.status(201).json({
      message: "Medição cadastrada com sucesso",
      id: rows.insertId,
      descricao,
      tipo,
      valor_original,
      unidade_original,
      valor_convertido,
      unidade_convertida,
      status,
    });
  } catch (error) {
    console.error("Erro ao cadastrar medição:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// Rota para buscar todas as medições
app.get("/medicao", async (req, res) => {
  try {
    const rows = await db.prepare("SELECT * FROM medicoes").all();
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao buscar medições:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// Rota para buscar todas as medições com status "Temperatura Ideal"
app.get("/medicao/temperatura_ideal", async (req, res) => {
  try {
    const medicoes = await db
      .prepare("SELECT * FROM medicoes WHERE status = 'Temperatura Ideal'")
      .all();
    if (medicoes.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhuma medição de temperatura ideal encontrada",
      });
    }
    res.status(200).json(medicoes);
  } catch (error) {
    console.error("Erro ao buscar medições de temperatura ideal:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// Rota para buscar uma medição específica pelo ID
app.get("/medicao/:id", async (req, res) => {
  try {
    const medicao = await db
      .prepare("SELECT * FROM medicoes WHERE id = ?")
      .get(req.params.id);
    if (medicao === undefined) {
      return res.status(404).json({
        mensagem: "Medição não encontrada",
      });
    }
    res.status(200).json(medicao);
  } catch (error) {
    console.error("Erro ao buscar medição:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

// Rota para atualizar uma medição existente
app.put("/medicao/:id", async (req, res) => {
  // const { id } = req.params;
  const { descricao, tipo, valor_original, unidade_original } = req.body;
  if (!descricao || !tipo || !valor_original || !unidade_original) {
    return res.status(400).json({
      mensagem: "Verifique se todos os campos estão preenchidos",
    });
  }
  const { valor_convertido, unidade_convertida, status } = classeTemp(
    Number(valor_original),
    String(unidade_original),
  );
  try {
    const newMedicao = await db
      .prepare(
        "UPDATE medicoes SET `descricao` = ?, `tipo` = ?, `valor_original` = ?, `unidade_original` = ?, `valor_convertido` = ?, `unidade_convertida` = ?, `status` = ? WHERE `medicoes`.`id` = ?;",
      )
      .run([
        descricao,
        tipo,
        valor_original,
        unidade_original,
        valor_convertido,
        unidade_convertida,
        status,
        req.params.id,
      ]);
    if (newMedicao.changes === 0) {
      return res.status(404).json({
        mensagem: "Medição não encontrada",
      });
    }

    res.status(200).json({
      mensagem: "Medição atualizada com sucesso.",
    });
  } catch (error) {
    (console.error("Erro ao atualizar medição:", error),
      res.status(500).json({
        mensagem: "Erro Interno do Servidor",
      }));
  }
});

// Rota para apagar uma medição existente
app.delete("/medicao/:id", async (req, res) => {
  try {
    const medicao = await db
      .prepare("DELETE FROM medicoes WHERE id = ?")
      .run(req.params.id);

    if (medicao.changes === 0) {
      return res.status(404).json({
        mensagem: "Medição não encontrada",
      });
    }
    res.status(200).json({ mensagem: "Medição apagada com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar medição:", error);
    res.status(500).json({
      mensagem: "Erro Interno do Servidor",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
