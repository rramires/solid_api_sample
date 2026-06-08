export default function getTestCoordinates() {
	const coordinates = {
		lat: -25.4677004,
		lon: -49.304584,
	}

	const coordinatesPlus5km = {
		lat: -25.467696,
		lon: -49.3251842,
	}

	const coordinatesPlus10km = {
		lat: -25.4349676,
		lon: -49.1669678,
	}

	return {
		coordinates,
		coordinatesPlus5km,
		coordinatesPlus10km,
	}
}
