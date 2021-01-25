import axios from '@/js_sdk/gangdiedao-uni-axios/index.js'
const http = axios.create({
	baseURL: "https://partner.simullive.cn/partnerapi",
})

http.interceptors.request.use(config => {
	let token = uni.getStorageSync('token')
	if (token) {
		config.headers['accessToken'] = token
	}
	return config
}, err => {
	return Promise.reject(err)
})

http.interceptors.response.use(res => {
	
	if (res.data.code !== 200){
		throw new Error(res.data.msg)		
	}
	return res

}, err => {
	return Promise.reject(err)
})
export default http
