// Função para calcular o imc
function classeTemp(valor_original, unidade_original) {
    const valor_convertido = (valor_original * 9 / 5) + 32;
    let unidade_convertida = "";

    if (unidade_original === "C") {
        unidade_convertida = "F";
    }

    let status = "";
    if (valor_original < 80) {
        status = "Temperatura Ideal";
    } else if (valor_original >= 80 && valor_original <= 105) {
        status = "Acima da temperatura ideal";
    } else if (valor_original > 105) {
        status = "Limite crítico";
    } else {
        status = "Erro ao calcular a classificação valor informado invalido.";
    }
    return { valor_convertido, unidade_convertida, status };
}
module.exports = classeTemp;