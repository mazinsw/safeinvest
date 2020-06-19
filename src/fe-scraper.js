const axios = require('axios').default
const cheerio = require('cheerio')

const fetchHtml = async (url, params) => {
    const response = await axios.get(url, { params })
    const html = response.data
    return cheerio.load(html)
}

const postForm = async (url, data = {}) => {
    const formData = new URLSearchParams()
    Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
            data[key].forEach(value => {
                formData.append(key, value)
            })
        } else {
            formData.append(key, data[key])
        }
    })
    const response = await axios.post(url, formData, { headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
    }})
    return response.data
}

const fetch = ({ fiis, sectors, incomes }) => {
    const url = `https://www.fundsexplorer.com.br/rendimentos-e-amortizacoes/filter`
    const filter = {}
    filter['filters[fiis][]'] = fiis
    filter['filters[incomeType][]'] = incomes
    filter['filters[sectorType][]'] = sectors
    filter['filters[period]'] = ''
    return postForm(url, filter)
}

const fetchList = async () => {
    const url = `https://www.fundsexplorer.com.br/rendimentos-e-amortizacoes`
    const $ = await fetchHtml(url, {})
    if ($('#search-menu-select').length == 0) {
        return null
    }

    const extractValues = matches => {
        const list = []
        matches.each((_, elem) => {
            list.push($(elem).val())
        })
        return list
    }

    const fiis = extractValues($('#search-menu-select > option'))
    const incomes = extractValues($('#income-type > option'))
    const sectors = extractValues($('#sector-type > option'))

    return {
        fiis,
        incomes,
        sectors
    }
}

const fetchAll = async () => {
    const lists = await fetchList()
    return fetch(lists)
}

const test = async () => {
    try {
        const data = await fetchAll()
        console.log(data)
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    fetchAll,
    test
}
