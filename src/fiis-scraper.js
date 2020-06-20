const axios = require('axios').default
const cheerio = require('cheerio')

const fetchHtml = async (url, params) => {
    const response = await axios.get(url, { params })
    const html = response.data
    return cheerio.load(html)
}

const fetch = async ticket => {
    const url = `https://fiis.com.br/${ticket}/`
    const $ = await fetchHtml(url, {})
    if ($('#last-revenues--table').length == 0) {
        return null
    }
    const getFloat = selector => {
        const value_text = selector.text()
        return parseFloat(value_text.replace(/[%\.$A-Za-z ]/g, '').replace(/,/g, '.'))
    }
    const rows = $('#last-revenues--table tbody tr')
    const dividends = []
    const names = ['base_date', 'pay_date', 'price', 'yield', 'dividend']
    rows.each((_, row) => {
        const line = {}
        $('td', row).each((index, col) => {
            const name = names[index]
            if (index >= 2) {
                line[name] = getFloat($(col))
            } else {
                line[name] = $(col).text()
            }
        })
        dividends.push(line)
    })
    if (dividends.length == 0) {
        return null
    }
    const name = $($('#informations--basic .item .value').get(0)).text()
    const type = $($('#informations--basic .item .value').get(1)).text()
    const category = $($('#informations--basic .item .value').get(2)).text()
    const register_date = $($('#informations--basic .item .value').get(3)).text()
    const quotes = getFloat($($('#informations--basic .item .value').get(4)))
    const shareholders = getFloat($($('#informations--basic .item .value').get(5)))
    const cnpj = $($('#informations--basic .item .value').get(6)).text()
    const price = getFloat($('#quotations--infos-wrapper .item.quotation .value'))
    const min52w = getFloat($('#quotations--infos-wrapper .item-group .min52 .value span+span'))
    const max52w = getFloat($('#quotations--infos-wrapper .item-group .max52 .value span+span'))
    const down = $('#quotations--infos-wrapper .item-group .val12 .change').hasClass('down')
    const patrimony = getFloat($($('#informations--indexes .item .value').get(3)))
    let valuation = getFloat($('#quotations--infos-wrapper .item-group .val12 .value span'))
    valuation = valuation * (down ? -1 : 1)
    const [{ dividend: value }] = dividends
    return {
        fundSymbol: ticket,
        name,
        type,
        category,
        register_date,
        quotes,
        shareholders,
        cnpj,
        price,
        value,
        patrimony,
        min52w,
        max52w,
        valuation,
        dividends
    }
}

const fetchList = async () => {
    const url = `https://fiis.com.br/lista-de-fundos-imobiliarios/`
    const $ = await fetchHtml(url, {})
    if ($('#funds-list').length == 0) {
        return null
    }

    const extractValues = matches => {
        const list = []
        matches.each((_, elem) => {
            list.push($(elem).text())
        })
        return list
    }

    return extractValues($('#funds-list .ticker'))
}

const test = async () => {
    try {
        const data = await fetch('abcp11')
        console.log(data)
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    fetch,
    fetchList,
    test
}
