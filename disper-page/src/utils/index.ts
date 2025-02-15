import VelModel from "./VelModel";

/**
 *
 * @param period_vals Array of periods to calculate velocity for
 * @param num_layers Number of layers
 * @param layer_thicknesses Thicknesses of each layer. Calculate using end_depth - start_depth
 * @param vels_shear Shear Wave velocity
 * @param phase_vel_min Minimum velocity - use min value from window
 * @param phase_vel_max Maximum velocity - use max value from window
 * @return Array of velocities for each period
 *         if a value would be outside the range of phase_vel_min-phase_vel_max, then null is returned for that value instead
 */
export function CalcCurve(
    period_vals: any[],
    num_layers: number,
    layer_thicknesses: number[], //
    vels_shear: any[], // The velocities from the model
    phase_vel_min: number, // The min value on the left plot
    phase_vel_max: number, // The max value on the left plot
) {
    // Create Array of densities the same size as the number of layers
    const densities = Array(num_layers).fill(2.0)
    // Calculate Vc as Vs * sqrt(3) - just using this as an estimate for modeling
    const vels_compression = vels_shear.map((x) => {
        return x * Math.sqrt(3)
    })
    // Create Vel Model object from parameters
    const model = new VelModel(
        num_layers,
        layer_thicknesses,
        densities,
        vels_compression,
        vels_shear,
        phase_vel_min,
        phase_vel_max,
        2.0,
    )
    return period_vals.map((x) => model.getc_period(x))
}
