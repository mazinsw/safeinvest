const axios = require('axios').default
const cheerio = require('cheerio')

const fetchHtml = async (url, params) => {
    const response = await axios.get(url, { params })
    const html = response.data
    return cheerio.load(html)
}

const fetchFundamentus = async papel => {
    const url = 'https://www.fundamentus.com.br/detalhes.php'
    const $ = await fetchHtml(url, { papel })
    if ($('table').length == 0) {
        return null
    }
    const indicadores = $($('table').get(2))
    const informacoes = $($('table').get(0))

    const getData = (title, table) => {
        return table.find(`.txt:contains("${title}")`).closest('td').next('.data').text()
    }
    const getFloat = title => {
        const value_text = getData(title, indicadores)
        return parseFloat(value_text.replace(/%\./g, '').replace(/,/g, '.'))
    }

    const data = {
        papel,
        empresa: getData('Empresa', informacoes),
        setor: getData('Setor', informacoes),
        subsetor: getData('Subsetor', informacoes),
        PL: getFloat('P/L'),
        liquidez_corrent: getFloat('Liquidez Corr'),
        dividendos: getFloat('Div. Yield'),
        LPA: getFloat('LPA'),
    }
    return data
}

const test = async () => {
    try {
        const data = await fetchFundamentus('UCAS3')
        console.log(data)
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    fetch: fetchFundamentus,
    test
}
